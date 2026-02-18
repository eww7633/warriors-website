export default function DonatePage() {
  return (
    <section className="card">
      <h2>Donate</h2>
      <p>
        Donations fund travel support, adaptive equipment, and reduced player costs.
      </p>
      <form className="stack" action="#" method="post">
        <label>
          Donation Amount (USD)
          <input name="amount" type="number" min="5" step="5" placeholder="100" />
        </label>
        <label>
          Email
          <input name="email" type="email" placeholder="supporter@example.com" />
        </label>
        <button className="button" type="submit">
          Continue to Payment
        </button>
      </form>
    </section>
  );
}
