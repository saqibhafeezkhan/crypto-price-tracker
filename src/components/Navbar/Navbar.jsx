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
  return (
    <div className="navbar">
      <Link to="/">
        <img src={logo} alt="logo" className="logo" height={70} width={380} />
      </Link>
      <nav className="nav-links" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Navbar;
