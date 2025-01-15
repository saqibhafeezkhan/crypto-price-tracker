import React from 'react';
import './Home.css';

const Home = () => {
  return (
    <div className='home'>
    <div className='hero'>
        <h1>Crypto Track & Trade</h1>
        <p>Fast, easy and secure way to purchase, sell and manage your crypto</p>
        <button>Get Started</button>
        <form>
            <input type='text' placeholder='Search crypto'/>
            <button type='submit'>Search</button>
        </form>
    </div>
    <div className="crypto-table">
        <div className="table-layout">
            <p>#</p>
            <p>Coins</p>
            <p>Price</p>
            <p style={{textAlign:"center"}}>24H Change</p>
            <p style={{textAlign:"right"}}>Market Cap</p>

        </div>
    </div>
    </div>
  )
}

export default Home