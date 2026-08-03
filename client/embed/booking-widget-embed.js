(function(window){
  // Booking Widget Embed loader - creates an iframe to host the booking UI
  function createBookingWidget(options){
    options = options || {};
    const container = typeof options.container === 'string' ? document.querySelector(options.container) : options.container || document.body;
    if (!container) throw new Error('Container element not found');

    const iframe = document.createElement('iframe');
    iframe.style.border = '0';
    iframe.style.width = options.width || '100%';
    iframe.style.height = options.height || '650px';
    iframe.src = options.src || (window.location.origin + '/embed/book-widget');
    iframe.setAttribute('loading','lazy');
    iframe.setAttribute('allow','camera; microphone');

    container.appendChild(iframe);

    const api = {
      iframe,
      on: function(eventName, cb){
        window.addEventListener('message', function handler(ev){
          if (!ev.data || ev.data.type !== eventName) return;
          cb(ev.data.payload);
        });
        return api;
      },
      destroy: function(){
        iframe.remove();
      }
    };

    return api;
  }

  // Expose as UMD global
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = createBookingWidget;
  } else {
    window.createBookingWidget = createBookingWidget;
  }
})(window);
