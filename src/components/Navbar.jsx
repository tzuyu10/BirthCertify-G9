import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';


const Navbar = () => {
  return (
    <header className="headerNav">
      <Link to="/" className="logoNav">
        <img src="/Asset 1.svg" alt="logo" className="logoImg" />
        BirthCertify
      </Link>
      <nav className="navLinks">
        <Link to="/">Home</Link>
        <Link to="/Request">Request</Link>
        <Link to="/About">About</Link>
      </nav>
    </header>
  );
};

export default Navbar;