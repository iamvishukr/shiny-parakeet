import { LeaveBalance, LeaveType } from "./types";

/**
 * Calculates dynamic balances at view-time by evaluating expiry dates.
 * It uses a FIFO (First-In, First-Out) method: debits (used leaves) are applied
 * to the oldest credits first. Any remaining unused credits that have passed their
 * expiryDate are considered expired and excluded from the available balance.
 *
 * @param balance The raw LeaveBalance from Firestore
 * @param policyTypes The current LeavePolicy types
 * @returns A new LeaveBalance object with dynamically computed `available` and `expired` fields
 */
export function calculateDynamicBalances(
  balance: LeaveBalance | undefined,
  policyTypes: LeaveType[]
): LeaveBalance {
  if (!balance) return { employeeId: "", year: new Date().getFullYear(), balances: {}, transactions: [] };

  const dynamicBalance = JSON.parse(JSON.stringify(balance)) as LeaveBalance;
  const now = new Date();

  for (const lt of policyTypes) {
    const typeTransactions = dynamicBalance.transactions.filter((t) => t.leaveType === lt.id);
    const credits = typeTransactions
      .filter((t) => t.type === "credit")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const debits = typeTransactions.filter((t) => t.type === "debit");

    let totalUsed = debits.reduce((sum, curr) => sum + curr.amount, 0);
    let totalCredited = 0;
    let totalExpired = 0;
    let dynamicAvailable = 0;
    let nextExpiryDate: string | undefined = undefined;
    let nextExpiryAmount = 0;

    for (const credit of credits) {
      totalCredited += credit.amount;

      // Determine how much of this credit has been consumed by total debits
      let consumedFromThisCredit = 0;
      if (totalUsed >= credit.amount) {
        consumedFromThisCredit = credit.amount;
        totalUsed -= credit.amount;
      } else if (totalUsed > 0) {
        consumedFromThisCredit = totalUsed;
        totalUsed = 0;
      }

      const unusedPortion = credit.amount - consumedFromThisCredit;

      // If there is an unused portion, check if it has expired
      if (unusedPortion > 0) {
        if (credit.expiryDate && now.getTime() > new Date(credit.expiryDate).getTime()) {
          // This portion has expired
          totalExpired += unusedPortion;
        } else {
          // This portion is valid and available
          dynamicAvailable += unusedPortion;

          if (credit.expiryDate) {
            if (!nextExpiryDate || new Date(credit.expiryDate).getTime() < new Date(nextExpiryDate).getTime()) {
              nextExpiryDate = credit.expiryDate;
              nextExpiryAmount = unusedPortion;
            } else if (nextExpiryDate === credit.expiryDate) {
              nextExpiryAmount += unusedPortion;
            }
          }
        }
      }
    }

    // Ensure the entry exists
    if (!dynamicBalance.balances[lt.id]) {
      dynamicBalance.balances[lt.id] = { total: 0, used: 0, available: 0 };
    }

    // Assign dynamically calculated values
    // `total` remains the total credited amount over time
    dynamicBalance.balances[lt.id].total = totalCredited;
    // `used` remains the total debited amount
    dynamicBalance.balances[lt.id].used = debits.reduce((sum, curr) => sum + curr.amount, 0);
    // `available` reflects only unexpired, unused leaves
    dynamicBalance.balances[lt.id].available = dynamicAvailable;
    // `expired` reflects unused leaves that have passed their expiry date
    dynamicBalance.balances[lt.id].expired = totalExpired;
    // upcoming expiry info
    dynamicBalance.balances[lt.id].nextExpiryDate = nextExpiryDate;
    dynamicBalance.balances[lt.id].nextExpiryAmount = nextExpiryAmount;
  }

  return dynamicBalance;
}
