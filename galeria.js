document.addEventListener("DOMContentLoaded", function () {

  const myCarousel = document.querySelector('#carouselExampleIndicators');

  // Crear instancia del carrusel desde JavaScript
  const carousel = new bootstrap.Carousel(myCarousel, {
    interval: 3000,   
    ride: "carousel", 
    pause: "hover",   
    wrap: true        
  });

  // Agregar transición fade
  myCarousel.classList.add("carousel-fade");

});


