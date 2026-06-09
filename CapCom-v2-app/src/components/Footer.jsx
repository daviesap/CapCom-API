export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <img
          src="/flair-logo.png"
          alt="Flair logo"
          className="footer-logo"
        />
        <p className="footer-text">
          Powered by CapCom
          <br />
          from Flair Ltd
          <br />
          <a href="https://www.flair.london" target="_blank" rel="noopener noreferrer">
            www.flair.london
          </a>
        </p>
      </div>
    </footer>
  );
}
