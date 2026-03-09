'use client';

/**
 * Buy Me a Coffee Button
 * 
 * Simple button that opens Buy Me a Coffee modal.
 * Designed to be placed inside footer alongside other action buttons.
 */

import { useEffect } from 'react';

export default function BuyMeCoffeeButton() {
  useEffect(() => {
    // Load the Buy Me a Coffee script but hide the floating widget
    const script = document.createElement('script');
    script.setAttribute('data-name', 'BMC-Widget');
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js';
    script.setAttribute('data-id', 'normallabs');
    script.setAttribute('data-description', 'Support me on Buy me a coffee!');
    script.setAttribute('data-message', '');
    script.setAttribute('data-color', '#BD5FFF');
    script.setAttribute('data-position', 'Right');
    script.setAttribute('data-x_margin', '18');
    script.setAttribute('data-y_margin', '18');
    script.async = true;
    
    // Manually trigger DOMContentLoaded after script loads
    script.onload = function() {
      const evt = document.createEvent('Event');
      evt.initEvent('DOMContentLoaded', false, false);
      window.dispatchEvent(evt);
      
      // Hide the floating widget button after it's created (with !important to override inline styles)
      setTimeout(() => {
        const bmcButton = document.getElementById('bmc-wbtn');
        if (bmcButton) {
          bmcButton.style.setProperty('display', 'none', 'important');
        }
      }, 100);
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      const widgetBtn = document.getElementById('bmc-wbtn');
      if (widgetBtn) {
        document.body.removeChild(widgetBtn);
      }
    };
  }, []);

  const handleClick = () => {
    // Trigger the Buy Me a Coffee widget
    const bmcButton = document.getElementById('bmc-wbtn');
    if (bmcButton) {
      bmcButton.click();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
    >
      ☕ Support
    </button>
  );
}
