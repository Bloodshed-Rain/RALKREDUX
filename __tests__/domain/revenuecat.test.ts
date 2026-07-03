import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import {
  describeOfferingIssue,
  selectAvailableOffering,
  shouldAdvertiseTrial,
  type OfferingDiagnostics,
} from '@/src/domain/subscription/revenuecat';

function packageWithId(identifier: string): PurchasesPackage {
  return { identifier } as PurchasesPackage;
}

function offering(identifier: string, packageIds: string[] = []): PurchasesOffering {
  return {
    identifier,
    serverDescription: identifier,
    metadata: {},
    availablePackages: packageIds.map(packageWithId),
    lifetime: null,
    annual: null,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    monthly: null,
    weekly: null,
    webCheckoutUrl: null,
  };
}

describe('selectAvailableOffering', () => {
  it('prefers the configured offering when it has packages', () => {
    const configured = offering('default', ['$rc_monthly']);
    const current = offering('current', ['$rc_annual']);

    expect(
      selectAvailableOffering(
        {
          all: { default: configured, current },
          current,
        },
        'default',
      ),
    ).toBe(configured);
  });

  it('falls back to the current offering when the configured offering is missing packages', () => {
    const configured = offering('default');
    const current = offering('current', ['$rc_monthly']);

    expect(
      selectAvailableOffering(
        {
          all: { default: configured, current },
          current,
        },
        'default',
      ),
    ).toBe(current);
  });

  it('uses any populated offering when no configured or current offering has packages', () => {
    const defaultOffering = offering('default');
    const launch = offering('launch', ['$rc_monthly']);

    expect(
      selectAvailableOffering(
        {
          all: { default: defaultOffering, launch },
          current: defaultOffering,
        },
        null,
      ),
    ).toBe(launch);
  });

  it('returns the configured empty offering if there are no packages anywhere', () => {
    const configured = offering('default');

    expect(
      selectAvailableOffering(
        {
          all: { default: configured },
          current: null,
        },
        'default',
      ),
    ).toBe(configured);
  });
});

function diagnostics(overrides: Partial<OfferingDiagnostics> = {}): OfferingDiagnostics {
  return {
    platform: 'ios',
    configuredOfferingId: 'default',
    selectedOfferingId: 'default',
    currentOfferingId: 'default',
    allOfferingIds: ['default'],
    selectedOfferingPackageCount: 0,
    configuredOfferingPackageCount: 0,
    currentOfferingPackageCount: 0,
    totalPackageCount: 0,
    productIds: ['RALBSub'],
    directProductCount: null,
    directProductIdentifiers: [],
    directProductError: null,
    offeringsError: null,
    ...overrides,
  };
}

describe('describeOfferingIssue', () => {
  it('returns null when the selected offering has packages', () => {
    expect(describeOfferingIssue(diagnostics({ selectedOfferingPackageCount: 1 }))).toBeNull();
  });

  it('reports when the App Store returns no products for the configured product id', () => {
    expect(describeOfferingIssue(diagnostics({ directProductCount: 0 }))).toBe(
      'RevenueCat found offering "default", but the App Store returned 0 products for RALBSub.',
    );
  });

  it('keeps the underlying RevenueCat offerings error', () => {
    expect(
      describeOfferingIssue(
        diagnostics({
          offeringsError: 'None of the products registered in the RevenueCat dashboard could be fetched',
        }),
      ),
    ).toBe(
      'RevenueCat could not load offerings: None of the products registered in the RevenueCat dashboard could be fetched',
    );
  });
});

describe('shouldAdvertiseTrial', () => {
  it('requires a positive ELIGIBLE verdict on iOS', () => {
    expect(shouldAdvertiseTrial({ RALBSub: 'eligible' }, 'RALBSub', 'ios')).toBe(true);
    expect(shouldAdvertiseTrial({ RALBSub: 'ineligible' }, 'RALBSub', 'ios')).toBe(false);
    expect(shouldAdvertiseTrial({ RALBSub: 'unknown' }, 'RALBSub', 'ios')).toBe(false);
    // Missing product (eligibility fetch failed) must not promise a trial.
    expect(shouldAdvertiseTrial({}, 'RALBSub', 'ios')).toBe(false);
  });

  it('defers to the Play checkout sheet on Android', () => {
    expect(shouldAdvertiseTrial({}, 'monthly_subscription', 'android')).toBe(true);
    expect(shouldAdvertiseTrial({ monthly_subscription: 'unknown' }, 'monthly_subscription', 'android')).toBe(true);
  });
});
