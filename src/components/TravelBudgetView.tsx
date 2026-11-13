import React, { useMemo, useState } from 'react';
import { Check, Plus, RefreshCw, Trash2, Wallet, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  ApplicantProfile,
  BudgetExpenseItem,
  TravelBudget,
  VisaTrip,
} from '../types/visa';

interface TravelBudgetViewProps {
  budget: TravelBudget;
  trip: VisaTrip;
  profile: ApplicantProfile;
  onUpdateBudget: (next: TravelBudget) => void;
  onAskGuide: (prompt: string) => void;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
};

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function extractFeeDefaults(estimatedFee: string): { currency: string; amount: string } {
  const upper = estimatedFee.toUpperCase();
  const currency = upper.includes('EUR') || estimatedFee.includes('€')
    ? 'EUR'
    : upper.includes('GBP') || estimatedFee.includes('£')
      ? 'GBP'
      : upper.includes('INR') || estimatedFee.includes('₹')
        ? 'INR'
        : upper.includes('CAD')
          ? 'CAD'
          : upper.includes('AUD')
            ? 'AUD'
            : upper.includes('JPY') || estimatedFee.includes('¥')
              ? 'JPY'
              : 'USD';

  const match = estimatedFee.match(/\d+(?:[.,]\d+)?/);
  const amount = match ? match[0].replace(',', '') : '90';
  return { currency, amount };
}

export const TravelBudgetView: React.FC<TravelBudgetViewProps> = ({
  budget,
  trip,
  profile,
  onUpdateBudget,
  onAskGuide,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] =
    useState<BudgetExpenseItem['category']>('Visa & Admin');

  const symbol = CURRENCY_SYMBOLS[budget.currency] ?? `${budget.currency} `;

  const formatMoney = (value: number) =>
    `${symbol}${value.toLocaleString('en-US', {
      minimumFractionDigits: budget.currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: budget.currency === 'JPY' ? 0 : 2,
    })}`;

  const totals = useMemo(() => {
    const visaAmt = parseAmount(budget.visaFee);
    const serviceAmt = parseAmount(budget.serviceFee);
    const insuranceAmt = parseAmount(budget.travelInsurance);
    const flightAmt = parseAmount(budget.flightBookings);
    const lodgingAmt = parseAmount(budget.accommodation);

    let customTotal = 0;
    let customPaid = 0;
    let customVisa = 0;
    let customInsurance = 0;
    let customFlights = 0;
    let customOther = 0;

    budget.customExpenses.forEach((item) => {
      const amt = parseAmount(item.amount);
      customTotal += amt;
      if (item.paid) customPaid += amt;
      if (item.category === 'Visa & Admin') customVisa += amt;
      else if (item.category === 'Insurance') customInsurance += amt;
      else if (item.category === 'Flights') customFlights += amt;
      else customOther += amt;
    });

    const total =
      visaAmt + serviceAmt + insuranceAmt + flightAmt + lodgingAmt + customTotal;

    const paid =
      (budget.visaFeePaid ? visaAmt : 0) +
      (budget.serviceFeePaid ? serviceAmt : 0) +
      (budget.travelInsurancePaid ? insuranceAmt : 0) +
      (budget.flightBookingsPaid ? flightAmt : 0) +
      (budget.accommodationPaid ? lodgingAmt : 0) +
      customPaid;

    const remaining = Math.max(0, total - paid);

    const breakdown = [
      {
        label: 'Visa & Consular Fees',
        amount: visaAmt + serviceAmt + customVisa,
        color: 'bg-[#1E3A8A]',
        textColor: 'text-[#1E3A8A]',
      },
      {
        label: 'Travel Insurance',
        amount: insuranceAmt + customInsurance,
        color: 'bg-[#4F46E5]',
        textColor: 'text-[#4F46E5]',
      },
      {
        label: 'Flight Bookings',
        amount: flightAmt + customFlights,
        color: 'bg-[#10B981]',
        textColor: 'text-[#065F46]',
      },
      {
        label: 'Lodging & Extras',
        amount: lodgingAmt + customOther,
        color: 'bg-[#F59E0B]',
        textColor: 'text-[#92400E]',
      },
    ];

    return { total, paid, remaining, breakdown };
  }, [budget]);

  const verifiedBankNum = parseAmount(profile.bankBalance || '');
  const hasBankCheck = verifiedBankNum > 0 && totals.total > 0;
  const bankMatchesCurrency =
    !profile.currency || profile.currency.toUpperCase() === budget.currency.toUpperCase();

  const handleSyncFromTrip = () => {
    const { currency, amount } = extractFeeDefaults(trip.estimatedFee);
    onUpdateBudget({
      ...budget,
      currency,
      visaFee: amount,
    });
  };

  const handleAddCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || parseAmount(newAmount) <= 0) return;
    const item: BudgetExpenseItem = {
      id: `exp-${Date.now()}`,
      label: newLabel.trim(),
      category: newCategory,
      amount: newAmount.trim(),
      paid: false,
    };
    onUpdateBudget({
      ...budget,
      customExpenses: [...budget.customExpenses, item],
    });
    setNewLabel('');
    setNewAmount('');
  };

  const handleToggleCustomPaid = (id: string) => {
    onUpdateBudget({
      ...budget,
      customExpenses: budget.customExpenses.map((item) =>
        item.id === id ? { ...item, paid: !item.paid } : item
      ),
    });
  };

  const handleRemoveCustom = (id: string) => {
    onUpdateBudget({
      ...budget,
      customExpenses: budget.customExpenses.filter((item) => item.id !== id),
    });
  };

  const coreRows: Array<{
    id: string;
    label: string;
    hint: string;
    amountKey: 'visaFee' | 'serviceFee' | 'travelInsurance' | 'flightBookings' | 'accommodation';
    paidKey:
      | 'visaFeePaid'
      | 'serviceFeePaid'
      | 'travelInsurancePaid'
      | 'flightBookingsPaid'
      | 'accommodationPaid';
  }> = [
    {
      id: 'budget-visa-fee',
      label: 'Expected Visa Application Fee',
      hint: `Estimated government fee for ${trip.visaCode}: ${trip.estimatedFee}`,
      amountKey: 'visaFee',
      paidKey: 'visaFeePaid',
    },
    {
      id: 'budget-service-fee',
      label: 'Biometrics / VAC Service & Courier Fee',
      hint: 'Optional VFS, TLScontact, or passport return courier charges',
      amountKey: 'serviceFee',
      paidKey: 'serviceFeePaid',
    },
    {
      id: 'budget-insurance',
      label: 'Travel Medical Insurance',
      hint: 'Required for Schengen (€30k+ coverage) and recommended for all trips',
      amountKey: 'travelInsurance',
      paidKey: 'travelInsurancePaid',
    },
    {
      id: 'budget-flights',
      label: 'Flight Bookings (Round-Trip)',
      hint: 'Refundable ticket or confirmed flight itinerary cost',
      amountKey: 'flightBookings',
      paidKey: 'flightBookingsPaid',
    },
    {
      id: 'budget-lodging',
      label: 'Hotel / Accommodation Estimate',
      hint: 'Estimated stay cost matching your visa itinerary nights',
      amountKey: 'accommodation',
      paidKey: 'accommodationPaid',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Currency Selector */}
      <section className="clearskies-card rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#1E3A8A] font-semibold">
              <Wallet className="w-4 h-4" />
              <span>
                {trip.nationality} → {trip.destination} · {trip.visaCode}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1E293B] mt-1">Travel Budget Tracker</h1>
            <p className="text-sm text-[#475569] mt-0.5">
              Plan expected visa fees, travel insurance, and flights to estimate your total trip cost.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <label htmlFor="budget-currency" className="text-xs font-semibold text-[#475569]">
              Currency
            </label>
            <select
              id="budget-currency"
              value={budget.currency}
              onChange={(e) => onUpdateBudget({ ...budget, currency: e.target.value })}
              className="h-11 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white font-mono text-sm font-semibold text-[#1E293B] focus:outline-none focus:border-[#1E3A8A]"
            >
              {CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSyncFromTrip}
              className="h-11 px-3.5 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Visa Fee
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-[#EEF2FF]/70 border border-[#E0E7FF]">
            <p className="text-xs font-medium text-[#475569]">Total Estimated Trip Cost</p>
            <p className="mt-1 text-2xl font-extrabold font-mono tabular-nums text-[#1E3A8A]">
              {formatMoney(totals.total)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#ECFDF5]/70 border border-[#A7F3D0]/70">
            <p className="text-xs font-medium text-[#475569]">Already Paid</p>
            <p className="mt-1 text-2xl font-extrabold font-mono tabular-nums text-[#065F46]">
              {formatMoney(totals.paid)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
            <p className="text-xs font-medium text-[#475569]">Remaining to Budget</p>
            <p className="mt-1 text-2xl font-extrabold font-mono tabular-nums text-[#1E293B]">
              {formatMoney(totals.remaining)}
            </p>
          </div>
        </div>

        {/* Proportional Breakdown Bar */}
        {totals.total > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="h-3 w-full rounded-full overflow-hidden bg-slate-100 flex">
              {totals.breakdown.map((seg) => {
                const pct = (seg.amount / totals.total) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={seg.label}
                    style={{ width: `${pct}%` }}
                    className={`${seg.color} h-full transition-all`}
                    title={`${seg.label}: ${formatMoney(seg.amount)}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#475569]">
              {totals.breakdown.map((seg) => {
                const pct = Math.round((seg.amount / totals.total) * 100);
                return (
                  <div key={seg.label} className="inline-flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-xs ${seg.color}`} />
                    <span>{seg.label}:</span>
                    <span className={`font-mono tabular-nums font-semibold ${seg.textColor}`}>
                      {formatMoney(seg.amount)} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Bank Balance Comparison Banner (when scanned or filled in Document Vault) */}
      {hasBankCheck && bankMatchesCurrency && (
        <section
          className={`rounded-2xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            verifiedBankNum >= totals.total * 1.5
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FEF3C7] border-amber-200 text-[#92400E]'
          }`}
        >
          <div className="flex items-start gap-3">
            {verifiedBankNum >= totals.total * 1.5 ? (
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#10B981]" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#D97706]" />
            )}
            <div className="text-sm">
              <p className="font-bold">
                {verifiedBankNum >= totals.total * 1.5
                  ? 'Your verified bank balance comfortably covers this trip budget'
                  : 'Your bank statement balance is close to your estimated trip cost'}
              </p>
              <p className="text-xs mt-0.5">
                Scanned balance: <span className="font-mono font-semibold tabular-nums">{formatMoney(verifiedBankNum)}</span> vs. estimated trip cost{' '}
                <span className="font-mono font-semibold tabular-nums">{formatMoney(totals.total)}</span>. Consular officers typically look for at least 1.5x buffer beyond core costs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onAskGuide(
                `My estimated trip cost for ${trip.destination} (${trip.purpose}) is ${formatMoney(totals.total)} and my verified bank balance is ${formatMoney(verifiedBankNum)}. Is this financial buffer usually sufficient for consular review?`
              )
            }
            className="text-xs font-semibold underline whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
          >
            Ask UDAAN Guide
          </button>
        </section>
      )}

      {/* Core Cost Inputs Card */}
      <section className="clearskies-card rounded-2xl p-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-[#1E293B]">Core Visa &amp; Travel Costs</h2>
          <span className="text-xs text-[#475569]">Check items as you pay them</span>
        </div>

        <div className="space-y-3">
          {coreRows.map((row) => {
            const isPaid = budget[row.paidKey];
            return (
              <div
                key={row.id}
                className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isPaid}
                    aria-label={`Mark ${row.label} as paid`}
                    onClick={() =>
                      onUpdateBudget({ ...budget, [row.paidKey]: !isPaid })
                    }
                    className={`mt-0.5 w-6 h-6 rounded-[6px] shrink-0 flex items-center justify-center border transition-colors cursor-pointer ${
                      isPaid
                        ? 'bg-[#10B981] border-[#10B981] text-white'
                        : 'bg-white border-slate-300 hover:border-[#1E3A8A]'
                    }`}
                  >
                    {isPaid && <Check className="w-4 h-4 stroke-[2.5]" />}
                  </button>
                  <div>
                    <label htmlFor={row.id} className="block text-sm font-bold text-[#1E293B]">
                      {row.label}
                    </label>
                    <p className="text-xs text-[#475569] mt-0.5">{row.hint}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:w-48 shrink-0">
                  <span className="text-sm font-mono font-semibold text-[#475569] w-8 text-right">
                    {symbol}
                  </span>
                  <input
                    id={row.id}
                    type="number"
                    min="0"
                    step="any"
                    value={budget[row.amountKey]}
                    onChange={(e) =>
                      onUpdateBudget({ ...budget, [row.amountKey]: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white font-mono tabular-nums text-sm font-semibold text-[#1E293B] text-right focus:outline-none focus:border-[#1E3A8A] focus:ring-3 focus:ring-[#1E3A8A]/15"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Additional Custom Expenses */}
      <section className="clearskies-card rounded-2xl p-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-[#1E293B]">Additional Expenses</h2>
          <span className="text-xs font-mono tabular-nums text-[#475569]">
            {budget.customExpenses.length} items
          </span>
        </div>

        {budget.customExpenses.length > 0 && (
          <div className="space-y-2.5">
            {budget.customExpenses.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.paid}
                    onClick={() => handleToggleCustomPaid(item.id)}
                    className={`w-6 h-6 rounded-[6px] shrink-0 flex items-center justify-center border cursor-pointer ${
                      item.paid
                        ? 'bg-[#10B981] border-[#10B981] text-white'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {item.paid && <Check className="w-4 h-4 stroke-[2.5]" />}
                  </button>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        item.paid ? 'line-through text-slate-400' : 'text-[#1E293B]'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs text-[#475569]">{item.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono tabular-nums text-sm font-bold text-[#1E293B]">
                    {formatMoney(parseAmount(item.amount))}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustom(item.id)}
                    aria-label={`Remove ${item.label}`}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleAddCustomExpense}
          className="pt-2 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
        >
          <div className="sm:col-span-5 space-y-1">
            <label className="text-xs font-semibold text-[#475569]">Expense Name</label>
            <input
              type="text"
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Passport photos, document translation"
              className="w-full h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-semibold text-[#475569]">Category</label>
            <select
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value as BudgetExpenseItem['category'])
              }
              className="w-full h-12 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-xs font-medium focus:outline-none focus:border-[#1E3A8A]"
            >
              <option value="Visa & Admin">Visa &amp; Admin</option>
              <option value="Insurance">Insurance</option>
              <option value="Flights">Flights</option>
              <option value="Lodging & Other">Lodging &amp; Other</option>
            </select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-[#475569]">Amount ({budget.currency})</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0"
              className="w-full h-12 px-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white font-mono tabular-nums text-sm text-right focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-12 px-3 rounded-lg bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
