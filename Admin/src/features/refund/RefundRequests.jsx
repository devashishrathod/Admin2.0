import Refund from "./Refund";

/* -------------------------------------------------------------------------
 * Refund Requests — new refund requests from customers that haven't been
 * decided yet (waiting on the vendor, or on the admin's approve / reject).
 * Its own page and sidebar entry; the list, filters, approve / reject /
 * override and bulk actions are the Refunds page's own (scope "requests"),
 * so both stay in step. Decided refunds live on the Refunds page.
 * ---------------------------------------------------------------------- */
export default function RefundRequests() {
  return <Refund scope="requests" />;
}
