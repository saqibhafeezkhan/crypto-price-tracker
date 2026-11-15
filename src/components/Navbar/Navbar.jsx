import { Link } from 'react-router-dom';
import './Navbar.css';
import logo from '../../assets/b4b2a15c-087a-4bd9-b6f8-0f1333f81c79 1.svg';
import { CURRENCIES, DEFAULT_CURRENCY } from '../../constants/currencies';
import { useCoin } from '../../context/coinContext';

const Navbar = () => {
  const { currency, setCurrency } = useCoin();

  const handleCurrencyChange = (event) => {
    const { value } = event.target;
    setCurrency(CURRENCIES.find((option) => option.name === value) || DEFAULT_CURRENCY);
  };

  return (
    <div className="navbar">
      <Link to="/">
        <img src={logo} alt="logo" className="logo" height={70} width={380} />
      </Link>
      <div className="nav-right">
        <select value={currency.name} onChange={handleCurrencyChange} aria-label="Currency">
          {CURRENCIES.map(({ name }) => (
            <option key={name} value={name}>
              {name.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Navbar;
