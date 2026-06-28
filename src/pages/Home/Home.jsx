import React, { useContext } from 'react';
import './Home.css';
import { coinContext } from '../../context/CoinContext';
import { Link } from 'react-router-dom';

const Home = () => {
  const { allCoin, currency } = useContext(coinContext);

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
        {allCoin.slice(0, 100).map((item, index) => (
          <Link to={`/coin/${item.id}`} key={item.id} className="table-layout">
            <p>{item.market_cap_rank}</p>
            <div>
              <img src={item.image} alt={item.name}/>
              <p>{item.name + " - " + item.symbol.toUpperCase()}</p>
            </div>
            <p>{currency.symbol}{item.current_price}</p>
            <p style={{color: item.price_change_percentage_24h > 0 ? "green" : "red", textAlign:"center"}}>
              {Math.floor(item.price_change_percentage_24h * 100) / 100}%
            </p>
            <p style={{textAlign:"right"}}>{currency.symbol}{item.market_cap}</p>
          </Link>
        ))}
    </div>
    </div>
  )
}

export default Home