import React from 'react';
import {Button} from 'react-bootstrap';
import './Navbar.css';
import logo from '../../assets/b4b2a15c-087a-4bd9-b6f8-0f1333f81c79 1.svg';


const Navbar = () => {
  return (
    <div className='navbar'>
        <img src={logo} alt="logo" className='logo' height={70} width={380} />
        <ul>
            <li>Home</li>
            <li>Features</li>
            <li>Pricing</li>
            <li>Blog</li>
        </ul>
        <div className='nav-right'>
            <select>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="inr">INR</option>
            </select>
        <Button variant="primary">Connect Wallet</Button>
        </div>
    </div>
  )
}

export default Navbar