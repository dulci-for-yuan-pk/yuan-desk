/* /api/ops — the operations desk.
   GET                                  -> runs, approvals, tasks
   POST { approvalId, decision }        -> he approves or refuses, DULCi is told
   POST { taskId, action:'cancel' }      -> he stops a task */
import { json, bad, guard, hasDb, callAgent } from './_lib.js';
import { ops, decideApproval, appendEvent, cancelTask } from './_store.js';

const tellAgent = (origin, message, extra = {}) =>
  callAgent({ message, ...extra }, { origin });

export default async req => {
  const stop = guard(req); if (stop) return stop;

  if (req.method === 'GET') return json({ ok: true, ...(await ops()) });
  if (req.method !== 'POST') return bad('method', 405);
  if (!hasDb()) return json({ ok: false, error: 'no-database' }, 503);

  let body = {};
  try { body = await req.json(); } catch { return bad('body'); }
  const origin = new URL(req.url).origin;

  if (body.approvalId) {
    const decision = body.decision === 'approved' ? 'approved' : 'rejected';
    try {
      const row = (await decideApproval(body.approvalId, decision))[0];
      await appendEvent({
        kind: 'note',
        text: decision === 'approved'
          ? 'آپ نے منظوری دے دی۔ DULCi کام مکمل کر رہا ہے۔'
          : 'آپ نے منع کر دیا۔ DULCi رک گیا ہے۔'
      });
      await tellAgent(origin,
        decision === 'approved'
          ? `He APPROVED the pending item "${row?.title_en || row?.kind || ''}". Carry it out now and report back.`
          : `He REFUSED the pending item "${row?.title_en || row?.kind || ''}". Do not proceed; ask him what to change.`,
        { event: 'approval', approvalId: body.approvalId, decision, payload: row?.payload });
      return json({ ok: true, decision });
    } catch (e) {
      return json({ ok: false, error: String(e.message || e) }, 502);
    }
  }

  if (body.taskId && body.action === 'cancel') {
    try {
      await cancelTask(body.taskId);
      await tellAgent(origin, 'He cancelled a task on the desk. Stop that work.',
        { event: 'task-cancel', taskId: body.taskId });
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: String(e.message || e) }, 502);
    }
  }

  return bad('unknown-action');
};
