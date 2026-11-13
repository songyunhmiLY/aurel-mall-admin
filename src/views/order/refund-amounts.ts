import type { ApproveRefundBody } from '@/api/refunds'
import { parseYuanToFen } from '@/api/money'

export type RefundAmountMode = 'refund' | 'deduction'

export interface RefundAmountPreview {
  refundFen: number
  deductionFen: number
  enteredFen: number
  otherFen: number
}

/** 预览另一项。提交时仍只发送所填的那一项。 */
export function previewRefundAmounts(
  payAmountFen: number,
  mode: RefundAmountMode,
  yuan: string,
): { ok: true; preview: RefundAmountPreview } | { ok: false; message: string } {
  if (!yuan.trim()) {
    return { ok: false, message: mode === 'refund' ? '请填写退款金额' : '请填写减扣金额' }
  }
  const fen = parseYuanToFen(yuan)
  if (fen == null) return { ok: false, message: '金额不正确' }
  if (!Number.isSafeInteger(payAmountFen) || payAmountFen < 0) {
    return { ok: false, message: '应付金额不正确' }
  }
  if (fen > payAmountFen) return { ok: false, message: '不能超过应付金额' }
  const otherFen = payAmountFen - fen
  if (mode === 'refund') {
    return {
      ok: true,
      preview: { refundFen: fen, deductionFen: otherFen, enteredFen: fen, otherFen },
    }
  }
  return {
    ok: true,
    preview: { refundFen: otherFen, deductionFen: fen, enteredFen: fen, otherFen },
  }
}

export function approveBody(
  mode: RefundAmountMode,
  preview: RefundAmountPreview,
): ApproveRefundBody {
  if (mode === 'refund') return { refundFen: preview.refundFen }
  return { deductionFen: preview.deductionFen }
}
