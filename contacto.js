document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formContacto");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    
    // Obtener valores
    const correo = document.getElementById("correoContacto").value.trim();
    const nombre = document.getElementById("nombreContacto").value.trim();
    const numero = document.getElementById("numeroContacto").value.trim();

    // Elementos para mostrar errores
    const errorCorreo = document.getElementById("errorCorreo");
    const errorNombre = document.getElementById("errorNombre");
    const errorNumero = document.getElementById("errorNumero");
    const mensaje = document.getElementById("mensajeRespuesta");

    // Limpiar errores
    errorCorreo.textContent = "";
    errorNombre.textContent = "";
    errorNumero.textContent = "";
    mensaje.textContent = "";

    let valido = true;

    // Validar correo
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (correo === "") {
      errorCorreo.textContent = "Ingresa un correo.";
      valido = false;
    } else if (!regexCorreo.test(correo)) {
      errorCorreo.textContent = "Correo inválido.";
      valido = false;
    }

    // Validar nombre
    const regexNombre = /^[a-zA-ZÀ-ÿ\s]{3,40}$/;
    if (nombre === "") {
      errorNombre.textContent = "Ingresa tu nombre.";
      valido = false;
    } else if (!regexNombre.test(nombre)) {
      errorNombre.textContent = "El nombre solo debe contener letras.";
      valido = false;
    }

    // Validar número
    if (numero === "") {
      errorNumero.textContent = "Ingresa tu número.";
      valido = false;
    } else if (numero.length < 7 || isNaN(numero)) {
      errorNumero.textContent = "Número inválido.";
      valido = false;
    }

    if (!valido) return;

    // Si todo está correcto
    mensaje.textContent = "Datos enviados correctamente";
    mensaje.style.color = "green";

    form.reset();
  });
});
