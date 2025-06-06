import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="mb-8">
      <footer className="w-full py-4 bg-gray-800 text-gray-300">
        <div style={{ width: '100%', maxWidth: '1200px', margin: '10px auto', textAlign: 'center' }}>
          <p>
            &copy; {currentYear} Major Myles. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Footer;