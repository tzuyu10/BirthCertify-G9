import React from 'react'
import '../styles/Navbar.css'

const Navbar = () => {
  return (
    <header className="headerNav">
        <a href="/" className="logoNav">
        <img src="/Asset 1.svg" alt="logo" className="logoImg" />
        BirthCertify
        </a>


        <nav className="navLinks">
            <a href="/">Home</a>
            <a href="/">About</a>
            <a href="/">Request</a>
            <a href="/">Login</a>
            <a href="/">Sign Up</a>
        </nav>
    </header>
  )
}

export default Navbar