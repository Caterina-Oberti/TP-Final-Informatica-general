const images = [
  "imagenes/ramo-lirio.jfif",
  "imagenes/ramo-rosas.jfif",
  "imagenes/ramo-surtido.jfif",
  "imagenes/ramo-tulipanes.jfif",
];

const descriptions = [
  "Ramo de lirios blancos, elegante y delicado.",
  "Ramo de rosas rojas, ideal para ocasiones románticas.",
  "Ramo surtido con flores variadas y coloridas.",
  "Ramo de tulipanes frescos y modernos."
];

let index = 0;

// Mostrar imagen y descripción actual
function showImage() {
  document.getElementById("imagen").src = images[index];
  document.getElementById("descripcion").textContent = descriptions[index];
}

// Siguiente imagen
function nextImage() {
  index = (index + 1) % images.length;
  showImage();
}

// Imagen anterior
function prevImage() {
  index = (index - 1 + images.length) % images.length;
  showImage();
}

// Mostrar la primera imagen al cargar
showImage();
