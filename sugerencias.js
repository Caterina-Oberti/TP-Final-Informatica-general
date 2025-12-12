document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formSugerencias");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    
    // Obtener valores
    const diccionario = document.getElementById("diccionarioSugerencias").value.trim();
    const ramos = document.getElementById("ramosSugerencias").value.trim();
    const alternativo = document.getElementById("alternativoSugerencias").value.trim();
    const curiosidades = document.getElementById("curiosidadesSugerencias").value.trim();

    // Elementos para mostrar errores
    const errorDiccionario = document.getElementById("errorDiccionario");
    const errorRamos = document.getElementById("errorRamos");
    const errorAlternativo = document.getElementById("errorAlternativo");
    const errorCuriosidades = document.getElementById("errorCuriosidades");
    const mensaje = document.getElementById("mensajeEnviado");

    // Limpiar errores
    errorDiccionario.textContent = "";
    errorRamos.textContent = "";
    errorAlternativo.textContent = "";
    errorCuriosidades.textContent = "";
    mensaje.textContent = "";

    let valido = true;

    // Validar diccionario
    const regexDiccionario = /^[a-zA-ZÀ-ÿ\s]{3,40}$/;
    if (diccionario === "") {
      errorDiccionario.textContent = "Porfavor llene el campo.";
      valido = false;
    } else if (!regexDiccionario.test(diccionario)) {
      errorDiccionario.textContent = "Sugerencia inválida.";
      valido = false;
    }

    // Validar ramos
    const regexRamos = /^[a-zA-ZÀ-ÿ\s]{3,40}$/;
    if (ramos === "") {
      errorRamos.textContent = "Porfavor llene el campo.";
      valido = false;
    } else if (!regexRamos.test(ramos)) {
      errorRamos.textContent = "Sugerencia inválida.";
      valido = false;
    }

    // Validar alternativo
    const regexAlternativo = /^[a-zA-ZÀ-ÿ\s]{3,40}$/;
    if (alternativo === "") {
      errorAlternativo.textContent = "Porfavor llene el campo.";
      valido = false;
    } else if (!regexAlternativo.test(alternativo)) {
      errorAlternativo.textContent = "Sugerencia inválida.";
      valido = false;
    }

    // Validar curiosidades
    const regexCuriosidades = /^[a-zA-ZÀ-ÿ\s]{3,40}$/;
    if (curiosidades === "") {
      errorCuriosidades.textContent = "Porfavor llene el campo.";
      valido = false;
    } else if (!regexCuriosidades.test(curiosidades)) {
      errorCuriosidades.textContent = "Sugerencia inválida.";
      valido = false;
    }

    if (!valido) return;

    // Si todo está correcto
    mensaje.textContent = "Sugerencia enviada";
    mensaje.style.color = "green";

    form.reset();
  });
});
