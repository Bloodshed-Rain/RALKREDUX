import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { SUBSCRIPTION_MANAGEMENT_URL } from './store-details';
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  MakePurchaseResult,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesStoreProduct,
} from 'react-native-purchases';

export const DEFAULT_ENTITLEMENT_ID = 'pro';
export const DEFAULT_IOS_PRODUCT_IDS = ['RALBSub'];
export const DEFAULT_ANDROID_PRODUCT_IDS = ['monthly_subscription'];

export type BillingPlatform = 'ios' | 'android';

export interface RevenueCatConfig {
  configured: boolean;
  platform: BillingPlatform | null;
  apiKey: string;
  entitlementId: string;
  offeringId: string | null;
  productIds: string[];
}

export interface SubscriptionCache {
  active: boolean;
  appUserId: string | null;
  entitlementId: string;
  checkedAt: string;
  expirationDate: string | null;
  managementURL: string | null;
  productIdentifier: string | null;
  willRenew: boolean | null;
  periodType: string | null;
}

export interface OfferingDiagnostics {
  platform: BillingPlatform | null;
  configuredOfferingId: string | null;
  selectedOfferingId: string | null;
  currentOfferingId: string | null;
  allOfferingIds: string[];
  selectedOfferingPackageCount: number | null;
  configuredOfferingPackageCount: number | null;
  currentOfferingPackageCount: number | null;
  totalPackageCount: number;
  productIds: string[];
  directProductCount: number | null;
  directProductIdentifiers: string[];
  directProductError: string | null;
  offeringsError: string | null;
}

export interface OfferingLookupResult {
  offering: PurchasesOffering | null;
  diagnostics: OfferingDiagnostics;
}

type PurchasesModule = typeof import('react-native-purchases');
type RevenueCatStringKey = 'appleApiKey' | 'googleApiKey' | 'entitlementId' | 'offeringId';
type RevenueCatListKey = 'iosProductIds' | 'androidProductIds';
type RevenueCatExtra = Partial<Record<RevenueCatStringKey | RevenueCatListKey, unknown>>;

let purchasesModule: PurchasesModule | null | undefined;
let configuredApiKey: string | null = null;
let configuredAppUserId: string | null = null;
let logLevelSet = false;

function buildPurchasesConfiguration(
  mod: PurchasesModule,
  config: RevenueCatConfig,
  appUserId: string,
): Parameters<PurchasesModule['default']['configure']>[0] {
  return {
    apiKey: config.apiKey,
    appUserID: appUserId,
    storeKitVersion:
      config.platform === 'ios' ? mod.STOREKIT_VERSION.STOREKIT_1 : undefined,
  };
}

function readRevenueCatExtra(): RevenueCatExtra {
  const extra = Constants.expoConfig?.extra as { revenueCat?: RevenueCatExtra } | undefined;
  return extra?.revenueCat ?? {};
}

function readExtraValue(key: RevenueCatStringKey): string {
  const extra = readRevenueCatExtra();
  const value = extra[key];
  return typeof value === 'string' ? value.trim() : '';
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readExtraList(key: RevenueCatListKey): string[] {
  return parseListValue(readRevenueCatExtra()[key]);
}

export function getRevenueCatConfig(): RevenueCatConfig {
  // All env resolution (EXPO_PUBLIC_* and legacy names) happens at config-eval
  // time in app.config.ts, which bakes the result into extra.revenueCat. A
  // runtime process.env[dynamicKey] fallback can never work on native — babel
  // only inlines static process.env.EXPO_PUBLIC_X member expressions.
  const platform: BillingPlatform | null =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : null;
  const apiKey =
    platform === 'ios'
      ? readExtraValue('appleApiKey')
      : platform === 'android'
        ? readExtraValue('googleApiKey')
        : '';
  const entitlementId = readExtraValue('entitlementId') || DEFAULT_ENTITLEMENT_ID;
  const offeringId = readExtraValue('offeringId');
  const configuredProductIds =
    platform === 'ios'
      ? readExtraList('iosProductIds')
      : platform === 'android'
        ? readExtraList('androidProductIds')
        : [];
  const productIds = configuredProductIds.length
    ? Array.from(new Set(configuredProductIds))
    : platform === 'ios'
      ? DEFAULT_IOS_PRODUCT_IDS
      : platform === 'android'
        ? DEFAULT_ANDROID_PRODUCT_IDS
        : [];

  return {
    configured: Boolean(platform && apiKey),
    platform,
    apiKey,
    entitlementId,
    offeringId: offeringId || null,
    productIds,
  };
}

function getPurchasesModule(): PurchasesModule | null {
  if (purchasesModule !== undefined) return purchasesModule;
  try {
    // Lazy-load so Jest, web, and binaries without the native module can still boot.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    purchasesModule = require('react-native-purchases') as PurchasesModule;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

export function isRevenueCatAvailable(): boolean {
  return getRevenueCatConfig().configured && getPurchasesModule() !== null;
}

export async function configureRevenueCat(appUserId: string): Promise<CustomerInfo | null> {
  const config = getRevenueCatConfig();
  if (!config.configured) return null;

  const mod = getPurchasesModule();
  if (!mod) throw new Error('revenuecat_native_module_unavailable');
  const Purchases = mod.default;

  if (!logLevelSet) {
    const level = __DEV__ ? mod.LOG_LEVEL.DEBUG : mod.LOG_LEVEL.WARN;
    await Purchases.setLogLevel(level).catch(() => undefined);
    logLevelSet = true;
  }

  if (configuredApiKey !== config.apiKey) {
    Purchases.configure(buildPurchasesConfiguration(mod, config, appUserId));
    configuredApiKey = config.apiKey;
    configuredAppUserId = appUserId;
    return null;
  }

  if (configuredAppUserId !== appUserId) {
    const result = await Purchases.logIn(appUserId);
    configuredAppUserId = appUserId;
    return result.customerInfo;
  }

  return null;
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  const mod = getPurchasesModule();
  if (!mod) throw new Error('revenuecat_native_module_unavailable');
  return mod.default.getCustomerInfo();
}

export function revenueCatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const maybe = error as { code?: unknown; message?: unknown; userInfo?: unknown };
    const message = maybe.message ? String(maybe.message) : 'RevenueCat request failed';
    return maybe.code ? `${message} (${String(maybe.code)})` : message;
  }
  return 'RevenueCat request failed';
}

function packageCount(offering: PurchasesOffering | null | undefined): number | null {
  return offering?.availablePackages?.length ?? null;
}

function createOfferingDiagnostics({
  config,
  offerings,
  selectedOffering,
  directProducts,
  directProductError,
  offeringsError,
}: {
  config: RevenueCatConfig;
  offerings: PurchasesOfferings | null;
  selectedOffering: PurchasesOffering | null;
  directProducts: PurchasesStoreProduct[] | null;
  directProductError: string | null;
  offeringsError: string | null;
}): OfferingDiagnostics {
  const allOfferings = offerings?.all ?? {};
  const configuredOffering = config.offeringId ? allOfferings[config.offeringId] ?? null : null;
  const allOfferingValues = Object.values(allOfferings);
  return {
    platform: config.platform,
    configuredOfferingId: config.offeringId,
    selectedOfferingId: selectedOffering?.identifier ?? null,
    currentOfferingId: offerings?.current?.identifier ?? null,
    allOfferingIds: Object.keys(allOfferings),
    selectedOfferingPackageCount: packageCount(selectedOffering),
    configuredOfferingPackageCount: packageCount(configuredOffering),
    currentOfferingPackageCount: packageCount(offerings?.current),
    totalPackageCount: allOfferingValues.reduce(
      (total, offering) => total + (offering.availablePackages?.length ?? 0),
      0,
    ),
    productIds: config.productIds,
    directProductCount: directProducts?.length ?? null,
    directProductIdentifiers: directProducts?.map((product) => product.identifier) ?? [],
    directProductError,
    offeringsError,
  };
}

async function getDirectStoreProducts(
  mod: PurchasesModule,
  productIds: string[],
): Promise<{ products: PurchasesStoreProduct[] | null; error: string | null }> {
  if (!productIds.length) return { products: null, error: null };
  try {
    const products = await mod.default.getProducts(
      productIds,
      mod.default.PRODUCT_CATEGORY.SUBSCRIPTION,
    );
    return { products, error: null };
  } catch (caught) {
    return { products: null, error: revenueCatErrorMessage(caught) };
  }
}

export async function getCurrentOfferingLookup(): Promise<OfferingLookupResult> {
  const mod = getPurchasesModule();
  if (!mod) throw new Error('revenuecat_native_module_unavailable');
  const config = getRevenueCatConfig();
  let offerings: PurchasesOfferings | null = null;
  let offeringsError: string | null = null;

  try {
    offerings = await mod.default.getOfferings();
  } catch (caught) {
    offeringsError = revenueCatErrorMessage(caught);
  }

  const selectedOffering = offerings ? selectAvailableOffering(offerings, config.offeringId) : null;
  const needsDirectProductCheck = !offeringHasPackages(selectedOffering);
  const directLookup = needsDirectProductCheck
    ? await getDirectStoreProducts(mod, config.productIds)
    : { products: null, error: null };

  return {
    offering: selectedOffering,
    diagnostics: createOfferingDiagnostics({
      config,
      offerings,
      selectedOffering,
      directProducts: directLookup.products,
      directProductError: directLookup.error,
      offeringsError,
    }),
  };
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const result = await getCurrentOfferingLookup();
  return result.offering;
}

function offeringHasPackages(offering: PurchasesOffering | null | undefined): offering is PurchasesOffering {
  return Boolean(offering?.availablePackages?.length);
}

export function selectAvailableOffering(
  offerings: Pick<PurchasesOfferings, 'all' | 'current'>,
  offeringId: string | null,
): PurchasesOffering | null {
  const configuredOffering = offeringId ? offerings.all[offeringId] ?? null : null;
  if (offeringHasPackages(configuredOffering)) return configuredOffering;
  if (offeringHasPackages(offerings.current)) return offerings.current;

  const firstAvailableOffering = Object.values(offerings.all).find(offeringHasPackages) ?? null;
  if (firstAvailableOffering) return firstAvailableOffering;

  return configuredOffering ?? offerings.current ?? null;
}

export function describeOfferingIssue(diagnostics: OfferingDiagnostics | null): string | null {
  if (!diagnostics || (diagnostics.selectedOfferingPackageCount ?? 0) > 0) return null;

  const offeringId =
    diagnostics.selectedOfferingId ??
    diagnostics.configuredOfferingId ??
    diagnostics.currentOfferingId ??
    'default';
  const productLabel = diagnostics.productIds.length
    ? diagnostics.productIds.join(', ')
    : 'the configured subscription product';

  if (diagnostics.offeringsError) {
    return `RevenueCat could not load offerings: ${diagnostics.offeringsError}`;
  }
  if (diagnostics.allOfferingIds.length === 0) {
    return 'RevenueCat returned no offerings for this build.';
  }
  if (diagnostics.directProductError) {
    return `RevenueCat found offering "${offeringId}", but the App Store product check failed for ${productLabel}: ${diagnostics.directProductError}`;
  }
  if (diagnostics.directProductCount === 0) {
    return `RevenueCat found offering "${offeringId}", but the App Store returned 0 products for ${productLabel}.`;
  }
  if ((diagnostics.directProductCount ?? 0) > 0) {
    return `The App Store returned ${productLabel}, but RevenueCat did not attach it to offering "${offeringId}".`;
  }
  return `RevenueCat returned offering "${offeringId}" with no purchasable packages.`;
}

export async function purchasePackage(aPackage: PurchasesPackage): Promise<MakePurchaseResult> {
  const mod = getPurchasesModule();
  if (!mod) throw new Error('revenuecat_native_module_unavailable');
  return mod.default.purchasePackage(aPackage);
}

export async function restorePurchases(): Promise<CustomerInfo> {
  const mod = getPurchasesModule();
  if (!mod) throw new Error('revenuecat_native_module_unavailable');
  return mod.default.restorePurchases();
}

export function addCustomerInfoListener(
  listener: CustomerInfoUpdateListener,
): (() => void) | null {
  const mod = getPurchasesModule();
  if (!mod) return null;
  mod.default.addCustomerInfoUpdateListener(listener);
  return () => {
    mod.default.removeCustomerInfoUpdateListener(listener);
  };
}

export type TrialEligibility = 'eligible' | 'ineligible' | 'unknown';

/**
 * iOS-only intro/trial eligibility lookup. Returns {} on Android (the Play
 * checkout sheet shows the user's true offer), when the module is missing, or
 * on any SDK error — callers treat an absent product id as "unknown".
 */
export async function checkTrialEligibility(
  productIds: string[],
): Promise<Record<string, TrialEligibility>> {
  const mod = getPurchasesModule();
  const config = getRevenueCatConfig();
  if (!mod || config.platform !== 'ios' || productIds.length === 0) return {};
  try {
    const statuses = mod.default.INTRO_ELIGIBILITY_STATUS;
    const result = await mod.default.checkTrialOrIntroductoryPriceEligibility(productIds);
    const map: Record<string, TrialEligibility> = {};
    for (const [productId, eligibility] of Object.entries(result)) {
      map[productId] =
        eligibility.status === statuses.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
          ? 'eligible'
          : eligibility.status === statuses.INTRO_ELIGIBILITY_STATUS_INELIGIBLE ||
              eligibility.status === statuses.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS
            ? 'ineligible'
            : 'unknown';
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Whether the paywall may advertise a free trial for this product. On iOS,
 * only a positive ELIGIBLE verdict qualifies — RevenueCat's guidance is to
 * show non-intro pricing on UNKNOWN rather than promise a trial the store
 * won't honor. Android defers to the Play checkout sheet (eligibility is not
 * knowable client-side; the sheet shows the user's real offer).
 */
export function shouldAdvertiseTrial(
  eligibility: Record<string, TrialEligibility>,
  productId: string,
  platform: BillingPlatform | null,
): boolean {
  if (platform !== 'ios') return true;
  return eligibility[productId] === 'eligible';
}

export function getActiveEntitlement(customerInfo: CustomerInfo | null, entitlementId: string) {
  return customerInfo?.entitlements.active[entitlementId] ?? null;
}

export function buildSubscriptionCache(
  customerInfo: CustomerInfo,
  entitlementId: string,
  appUserId: string | null,
): SubscriptionCache {
  const entitlement = getActiveEntitlement(customerInfo, entitlementId);
  return {
    active: Boolean(entitlement),
    appUserId: appUserId ?? customerInfo.originalAppUserId ?? null,
    entitlementId,
    checkedAt: new Date().toISOString(),
    expirationDate: entitlement?.expirationDate ?? null,
    managementURL: customerInfo.managementURL,
    productIdentifier: entitlement?.productIdentifier ?? null,
    willRenew: entitlement?.willRenew ?? null,
    periodType: entitlement?.periodType ?? null,
  };
}

export function isPurchaseCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: unknown; userCancelled?: unknown };
  return maybe.userCancelled === true || maybe.code === '1';
}

export function isOfflineBillingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: unknown; message?: unknown };
  return maybe.code === '10' || maybe.code === '35' || /network|offline/i.test(String(maybe.message ?? ''));
}

export function chooseDefaultPackage(packages: readonly PurchasesPackage[]): PurchasesPackage | null {
  return (
    packages.find((p) => p.identifier === '$rc_monthly') ??
    packages.find((p) => p.packageType === 'MONTHLY') ??
    packages.find((p) => p.identifier === '$rc_annual') ??
    packages.find((p) => p.packageType === 'ANNUAL') ??
    packages[0] ??
    null
  );
}

export async function openSubscriptionManagement(customerInfo: CustomerInfo | null): Promise<boolean> {
  const url = customerInfo?.managementURL ?? SUBSCRIPTION_MANAGEMENT_URL;
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}
