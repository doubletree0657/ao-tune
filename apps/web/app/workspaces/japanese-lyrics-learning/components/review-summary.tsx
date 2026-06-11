type ReviewSummaryProps = {
  needsReviewCount: number;
  reviewedCount: number;
  totalCount: number;
};

export default function ReviewSummary({
  needsReviewCount,
  reviewedCount,
  totalCount,
}: ReviewSummaryProps) {
  return (
    <aside
      aria-labelledby="review-summary-heading"
      aria-live="polite"
      className="review-summary"
    >
      <div>
        <h5 id="review-summary-heading">Review summary</h5>
        <p>Track the local review state of this generated draft.</p>
      </div>
      <dl>
        <div>
          <dt>Total line cards</dt>
          <dd>{totalCount}</dd>
        </div>
        <div>
          <dt>Reviewed</dt>
          <dd>{reviewedCount}</dd>
        </div>
        <div>
          <dt>Needs review</dt>
          <dd>{needsReviewCount}</dd>
        </div>
      </dl>
    </aside>
  );
}
