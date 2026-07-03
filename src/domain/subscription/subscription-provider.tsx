import React from 'react';
import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { useAuth } from '@/src/providers/auth-provider';
import { PrefKeys, readPref, writePref } from '@/src/storage/local-prefs';
import {
  addCustomerInfoListener,
  type BillingPlatform,
  buildSubscriptionCache,
  checkTrialEligibility,
  chooseDefaultPackage,
  configureRevenueCat,
  describeOfferingIssue,
  type OfferingDiagnostics,
  getActiveEntitlement,
  getCurrentOfferingLookup,
  getCustomerInfo,
  getRevenueCatConfig,
  isOfflineBillingError,
  isPurchaseCancelled,
  isRevenueCatAvailable,
  openSubscriptionManagement,
  purchasePackage,
  restorePurchases,
  type SubscriptionCache,
  type TrialEligibility,
} from './revenuecat';

export type SubscriptionStatus =
  | 'unavailable'
  | 'loading'
  | 'active'
  | 'inactive'
  | 'needs_connection'
  | 'error';

interface PurchaseResult {
  active: boolean;
  cancelled: boolean;
}

interface SubscriptionContextValue {
  configured: boolean;
  status: SubscriptionStatus;
  active: boolean;
  platform: BillingPlatform | null;
  trialEligibility: Record<string, TrialEligibility>;
  entitlementId: string;
  activeEntitlement: PurchasesEntitlementInfo | null;
  customerInfo: CustomerInfo | null;
  cached: SubscriptionCache | null;
  offering: PurchasesOffering | null;
  packages: PurchasesPackage[];
  defaultPackage: PurchasesPackage | null;
  busy: 'none' | 'purchase' | 'restore' | 'refresh' | 'manage';
  error: string | null;
  planIssue: string | null;
  offeringDiagnostics: OfferingDiagnostics | null;
  refresh: () => Promise<void>;
  purchase: (aPackage?: PurchasesPackage | null) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  manageSubscription: () => Promise<boolean>;
}

const SubscriptionContext = React.createContext<SubscriptionContextValue | null>(null);

function statusForCustomerInfo(customerInfo: CustomerInfo, entitlementId: string): SubscriptionStatus {
  return getActiveEntitlement(customerInfo, entitlementId) ? 'active' : 'inactive';
}

function cacheMatches(
  cache: SubscriptionCache | null,
  appUserId: string | null,
  entitlementId: string,
): cache is SubscriptionCache {
  if (!cache || cache.entitlementId !== entitlementId) return false;
  if (cache.appUserId && appUserId && cache.appUserId !== appUserId) return false;
  return true;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Subscription check failed';
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const config = React.useMemo(() => getRevenueCatConfig(), []);
  // Keys configured but the native module missing (Expo Go, a dev client built
  // before react-native-purchases was added) must degrade to unconfigured, not
  // to a dead-end error paywall whose Retry can never succeed.
  const sdkAvailable = React.useMemo(() => isRevenueCatAvailable(), []);
  const [cachedUserId, setCachedUserId] = React.useState<string | null>(auth.user?.id ?? null);
  const [cached, setCached] = React.useState<SubscriptionCache | null>(null);
  // The stored subscription cache / last-user prefs must be read before the
  // first refresh decides anything — otherwise an entitled offline user gets
  // paywalled by a refresh that raced the AsyncStorage hydration.
  const [hydrated, setHydrated] = React.useState(false);
  const [trialEligibility, setTrialEligibility] = React.useState<Record<string, TrialEligibility>>(
    {},
  );
  const [status, setStatus] = React.useState<SubscriptionStatus>(
    auth.configured && sdkAvailable ? 'loading' : 'unavailable',
  );
  const [customerInfo, setCustomerInfo] = React.useState<CustomerInfo | null>(null);
  const [offering, setOffering] = React.useState<PurchasesOffering | null>(null);
  const [offeringDiagnostics, setOfferingDiagnostics] =
    React.useState<OfferingDiagnostics | null>(null);
  const [planIssue, setPlanIssue] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<SubscriptionContextValue['busy']>('none');
  const [error, setError] = React.useState<string | null>(null);

  const appUserId = auth.user?.id ?? cachedUserId;
  const configured = auth.configured && sdkAvailable;
  const packages = offering?.availablePackages ?? [];
  const activeEntitlement = getActiveEntitlement(customerInfo, config.entitlementId);
  const defaultPackage = chooseDefaultPackage(packages);
  const usableCache = cacheMatches(cached, appUserId, config.entitlementId) ? cached : null;
  // Read by `refresh` via a ref so that cache updates (a new object is written on every
  // successful refresh) don't recreate the callback — that recreated `refresh` re-fires
  // the refresh effect, which writes a new cache object again: an infinite refresh loop.
  const usableCacheRef = React.useRef<SubscriptionCache | null>(usableCache);
  usableCacheRef.current = usableCache;

  const applyCustomerInfo = React.useCallback(
    async (nextInfo: CustomerInfo) => {
      const nextCache = buildSubscriptionCache(nextInfo, config.entitlementId, appUserId);
      setCustomerInfo(nextInfo);
      setCached(nextCache);
      setStatus(statusForCustomerInfo(nextInfo, config.entitlementId));
      await writePref(PrefKeys.subscriptionCache, nextCache);
    },
    [appUserId, config.entitlementId],
  );

  React.useEffect(() => {
    if (auth.user?.id) {
      setCachedUserId(auth.user.id);
      void writePref(PrefKeys.lastAuthUserId, auth.user.id);
    }
  }, [auth.user?.id]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedUserId, storedCache] = await Promise.all([
        readPref<string | null>(PrefKeys.lastAuthUserId, null),
        readPref<SubscriptionCache | null>(PrefKeys.subscriptionCache, null),
      ]);
      if (cancelled) return;
      if (!auth.user?.id && storedUserId) setCachedUserId(storedUserId);
      if (storedCache) {
        setCached(storedCache);
        const storedAppUserId = auth.user?.id ?? storedUserId;
        if (
          configured &&
          cacheMatches(storedCache, storedAppUserId, config.entitlementId) &&
          storedCache.active
        ) {
          setStatus('active');
        }
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, config.entitlementId, configured]);

  const refresh = React.useCallback(async () => {
    const cache = usableCacheRef.current;
    if (!configured) {
      setStatus('unavailable');
      setError(null);
      setPlanIssue(null);
      setOfferingDiagnostics(null);
      return;
    }
    if (!appUserId) {
      setStatus(cache?.active ? 'active' : 'needs_connection');
      setError(cache?.active ? null : 'Sign in online once to verify your subscription.');
      setPlanIssue(null);
      return;
    }

    setBusy((current) => (current === 'none' ? 'refresh' : current));
    setStatus((current) => (cache?.active && current !== 'inactive' ? 'active' : 'loading'));
    setError(null);
    setPlanIssue(null);

    try {
      const loginInfo = await configureRevenueCat(appUserId);
      if (loginInfo) await applyCustomerInfo(loginInfo);

      const [nextInfo, offeringLookup] = await Promise.all([
        getCustomerInfo(),
        getCurrentOfferingLookup(),
      ]);
      await applyCustomerInfo(nextInfo);
      setOffering(offeringLookup.offering);
      setOfferingDiagnostics(offeringLookup.diagnostics);
      setPlanIssue(describeOfferingIssue(offeringLookup.diagnostics));

      // iOS-only; {} elsewhere. Checked against the actual offering packages so
      // the paywall never advertises a trial the store won't honor.
      const packageProductIds =
        offeringLookup.offering?.availablePackages?.map((pkg) => pkg.product.identifier) ?? [];
      setTrialEligibility(
        await checkTrialEligibility(Array.from(new Set([...config.productIds, ...packageProductIds]))),
      );
    } catch (caught) {
      const cacheAtError = usableCacheRef.current;
      if (cacheAtError?.active && isOfflineBillingError(caught)) {
        setStatus('active');
        setError(null);
      } else {
        setStatus(cacheAtError?.active ? 'active' : 'error');
        setError(errorMessage(caught));
      }
    } finally {
      setBusy((current) => (current === 'refresh' ? 'none' : current));
    }
  }, [appUserId, applyCustomerInfo, config.productIds, configured]);

  React.useEffect(() => {
    if (!hydrated) return;
    void refresh();
  }, [hydrated, refresh]);

  React.useEffect(() => {
    if (!configured || !appUserId) return;
    const remove = addCustomerInfoListener((nextInfo) => {
      void applyCustomerInfo(nextInfo);
    });
    return () => {
      remove?.();
    };
  }, [appUserId, applyCustomerInfo, configured]);

  const purchase = React.useCallback(
    async (aPackage?: PurchasesPackage | null): Promise<PurchaseResult> => {
      const selected = aPackage ?? defaultPackage;
      if (!selected) throw new Error('subscription_no_package');
      setBusy('purchase');
      setError(null);
      try {
        const result = await purchasePackage(selected);
        await applyCustomerInfo(result.customerInfo);
        return {
          active: Boolean(getActiveEntitlement(result.customerInfo, config.entitlementId)),
          cancelled: false,
        };
      } catch (caught) {
        if (isPurchaseCancelled(caught)) return { active: false, cancelled: true };
        setError(errorMessage(caught));
        throw caught;
      } finally {
        setBusy('none');
      }
    },
    [applyCustomerInfo, config.entitlementId, defaultPackage],
  );

  const restore = React.useCallback(async (): Promise<PurchaseResult> => {
    setBusy('restore');
    setError(null);
    try {
      const nextInfo = await restorePurchases();
      await applyCustomerInfo(nextInfo);
      return {
        active: Boolean(getActiveEntitlement(nextInfo, config.entitlementId)),
        cancelled: false,
      };
    } catch (caught) {
      setError(errorMessage(caught));
      throw caught;
    } finally {
      setBusy('none');
    }
  }, [applyCustomerInfo, config.entitlementId]);

  const manageSubscription = React.useCallback(async () => {
    setBusy('manage');
    setError(null);
    try {
      return await openSubscriptionManagement(customerInfo);
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    } finally {
      setBusy('none');
    }
  }, [customerInfo]);

  const value = React.useMemo<SubscriptionContextValue>(
    () => ({
      configured,
      status,
      active: status === 'active',
      platform: config.platform,
      trialEligibility,
      entitlementId: config.entitlementId,
      activeEntitlement,
      customerInfo,
      cached,
      offering,
      packages,
      defaultPackage,
      busy,
      error,
      planIssue,
      offeringDiagnostics,
      refresh,
      purchase,
      restore,
      manageSubscription,
    }),
    [
      activeEntitlement,
      busy,
      cached,
      config.entitlementId,
      config.platform,
      configured,
      trialEligibility,
      customerInfo,
      defaultPackage,
      error,
      offeringDiagnostics,
      offering,
      packages,
      planIssue,
      purchase,
      refresh,
      restore,
      status,
      manageSubscription,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = React.useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
