import Navbar from './components/Navbar/Navbar';
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home/Home';
import Coin from './pages/Coin/Coin';
import DexPools from './pages/DexPools/DexPools';
import DefiFundamentals from './pages/DefiFundamentals/DefiFundamentals';
import CryptoNews from './pages/CryptoNews/CryptoNews';
import About from './pages/About/About';

const App = () => {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/coin/:coinId" element={<Coin />} />
        <Route path="/pools" element={<DexPools />} />
        <Route path="/defi" element={<DefiFundamentals />} />
        <Route path="/news" element={<CryptoNews />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
};

export default App;
