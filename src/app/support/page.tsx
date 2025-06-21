// pages/support.tsx
import Head from 'next/head';

export default function Support() {
  return (
    <>
      <Head>
        <title>Support | Rocket Fuel</title>
      </Head>
      <main style={styles.container}>
        <h1 style={styles.heading}>Support</h1>
        <p>If you’re experiencing issues with the Rocket Fuel app or have questions about your account, we’re here to help.</p>

        <section style={styles.section}>
          <h2 style={styles.subheading}>Contact Us</h2>
          <p>
            For support, please email us at: <br />
            <strong><a href="mailto:admin@rebootmember.com">admin@rebootmember.com</a></strong>
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>FAQ</h2>
          <ul>
            <li><strong>How do I log in?</strong> You must be enrolled in our Rocket Fuel coaching program. Accounts are pre-created for you.</li>
            <li><strong>I forgot my password.</strong> Click the forgot password button in the app.</li>
            <li><strong>I want to delete my data.</strong> Just email us with your request, and we’ll take care of it.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subheading}>Privacy</h2>
          <p>
            You can view our full privacy policy{' '}
            <a href="/privacy-policy" style={styles.highlightLink}>
              here
            </a>.
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
    marginBottom: '2rem',
  },
  highlightLink: {
    textDecoration: 'underline',
    color: '#004080',
    fontWeight: 'bold',
  },
};
