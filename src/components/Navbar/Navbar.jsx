import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';
import logo from '../../assets/b4b2a15c-087a-4bd9-b6f8-0f1333f81c79 1.svg';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/pools', label: 'Pools' },
  { to: '/defi', label: 'DeFi' },
  { to: '/news', label: 'News' },
  { to: '/about', label: 'About' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);

  // The menu only exists below the desktop breakpoint. Close it on the way up
  // so it does not reappear open after the viewport narrows again.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 992px)');
    const onChange = (event) => {
      if (event.matches) setIsOpen(false);
    };

    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      // Closing hides the focused link, so hand focus back to the toggle.
      if (menuRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
      setIsOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <div className="navbar">
      <Link to="/" className="navbar-brand" onClick={() => setIsOpen(false)}>
        <img src={logo} alt="logo" className="logo" height={70} width={380} />
      </Link>
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-label="Toggle navigation"
        aria-expanded={isOpen}
        aria-controls="primary-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
      </button>
      <nav
        ref={menuRef}
        id="primary-navigation"
        className={`nav-links${isOpen ? ' is-open' : ''}`}
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Navbar;
