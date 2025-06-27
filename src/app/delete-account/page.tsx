// pages/delete-account.tsx
import Head from 'next/head';

export default function DeleteAccount() {
  return (
    <>
      <Head>
        <title>Delete Account | Real Estate Rocket Fuel</title>
      </Head>
      <main style={styles.container}>
        <h1 style={styles.heading}>Delete Your Account</h1>
        <p><strong>Effective Date:</strong> June 27, 2025</p>

        <section style={styles.section}>
          <h2 style={styles.subheading}>1. Requesting Account Deletion</h2>
          <p>
            If you wish to delete your Rocket Fuel account and all associated data, please email us at{' '}
            <strong>admin@rebootmembers.com</strong> with the subject line: <em>"Delete My Account"</em>.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>2. What Data Will Be Deleted</h2>
          <p>Upon your request, we will permanently delete:</p>
          <ul>
            <li>Your user profile and login information</li>
            <li>All task logs and coaching progress data</li>
            <li>Any contacts or notes you've added</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>3. Processing Time</h2>
          <p>
            Account deletion requests are processed within <strong>7 days</strong> of receipt. Once completed, this action is
            permanent and cannot be undone.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>4. Questions or Support</h2>
          <p>
            If you have any questions about this process, or experience issues while trying to delete your account, contact us
            at <strong>admin@rebootmembers.com</strong>.
          </p>
        </section>
      </main>
    </>
  );
}

const styles = {
  container: {
    padding: '3rem 1.5rem',
    maxWidth: '800px',
    margin: 'auto',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.6,
    color: '#333',
  },
  heading: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  subheading: {
    fontSize: '1.5rem',
    marginTop: '2rem',
    marginBottom: '0.5rem',
    color: '#004080',
  },
  section: {
    marginBottom: '1.5rem',
  },
};
