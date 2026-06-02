import { careerHoursByScheme } from '@/src/domain/profile/hours-baseline';

describe('careerHoursByScheme', () => {
  it('adds the self-declared baseline to logged signed hours per scheme', () => {
    const result = careerHoursByScheme(
      {
        sprat_hours_baseline: 1200,
        irata_hours_baseline: 800,
        hours_baseline_date: '2026-01-01',
        hours_baseline_declared_at: '2026-01-02T00:00:00.000Z',
      },
      { spratSignedHours: 10.5, iratASignedHours: 8 },
    );

    expect(result.sprat).toEqual({ baseline: 1200, logged: 10.5, total: 1210.5 });
    expect(result.irata).toEqual({ baseline: 800, logged: 8, total: 808 });
    expect(result.declared).toBe(true);
    expect(result.transitionDate).toBe('2026-01-01');
  });

  it('treats a missing/undeclared baseline as zero and not declared', () => {
    const result = careerHoursByScheme(
      {
        sprat_hours_baseline: null,
        irata_hours_baseline: null,
        hours_baseline_date: null,
        hours_baseline_declared_at: null,
      },
      { spratSignedHours: 4, iratASignedHours: 0 },
    );

    expect(result.sprat).toEqual({ baseline: 0, logged: 4, total: 4 });
    expect(result.irata).toEqual({ baseline: 0, logged: 0, total: 0 });
    expect(result.declared).toBe(false);
    expect(result.transitionDate).toBeNull();
  });

  it('is null-safe when profile or stats are absent', () => {
    const result = careerHoursByScheme(null, null);
    expect(result.sprat.total).toBe(0);
    expect(result.irata.total).toBe(0);
    expect(result.declared).toBe(false);
  });
});
