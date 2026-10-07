//  Validação de formulários + integração com APIs públicas:
  //  - ViaCEP (endereço automático a partir do CEP)
  //  - Open-Meteo (clima do destino)

document.addEventListener("DOMContentLoaded", function () {

// validação
  const formsComValidacao = document.querySelectorAll(".needs-validation");

  // id do formulário -> id da mensagem de sucesso que aparece depois do envio
  const mensagensSucesso = {
    formCadastro: "cadastroSucesso",
    formContato: "contatoSucesso",
    reserva: "reservaSucesso",
    formNewsletter: "newsletterSucesso"
  };

  formsComValidacao.forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }

      form.classList.add("was-validated");

      const idSucesso = mensagensSucesso[form.id];

      if (idSucesso) {
        const sucesso = document.getElementById(idSucesso);
        sucesso.classList.remove("d-none");
        setTimeout(() => {
          form.reset();
          form.classList.remove("was-validated");
          sucesso.classList.add("d-none");

          // limpa a mensagem do CEP junto com o reset do cadastro
          if (form.id === "formCadastro") {
            cepStatus.textContent = "";
            cepStatus.classList.remove("text-danger", "text-success");
          }
        }, 2500);
      }
    });
  });

  const cepInput = document.getElementById("cadCep");
  const cepStatus = document.getElementById("cepStatus");

  if (cepInput) {
    cepInput.addEventListener("input", function () {
      let valor = cepInput.value.replace(/\D/g, "").slice(0, 8);
      if (valor.length > 5) {
        valor = valor.replace(/(\d{5})(\d{1,3})/, "$1-$2");
      }
      cepInput.value = valor;
    });

    cepInput.addEventListener("blur", function () {
      const cepLimpo = cepInput.value.replace(/\D/g, "");

      if (cepLimpo.length !== 8) {
        return;
      }

      cepStatus.textContent = "Buscando endereço...";
      cepStatus.classList.remove("text-danger", "text-success");

      fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        .then((resposta) => resposta.json())
        .then((dados) => {
          if (dados.erro) {
            cepStatus.textContent = "CEP não encontrado.";
            cepStatus.classList.add("text-danger");
            return;
          }

          document.getElementById("cadLogradouro").value = dados.logradouro || "";
          document.getElementById("cadBairro").value = dados.bairro || "";
          document.getElementById("cadCidade").value = dados.localidade || "";
          document.getElementById("cadUf").value = dados.uf || "";

          cepStatus.textContent = "Endereço encontrado com sucesso!";
          cepStatus.classList.add("text-success");

          document.getElementById("cadNumero").focus();
        })
        .catch(() => {
          cepStatus.textContent = "Não foi possível consultar o CEP agora.";
          cepStatus.classList.add("text-danger");
        });
    });
  }

//consulta o clima de uma cidade digitada pelo usuário
  const formClima = document.getElementById("formClima");
  const climaCidadeInput = document.getElementById("climaCidade");
  const climaResultado = document.getElementById("climaResultado");
  const climaMensagem = document.getElementById("climaMensagem");

  const descricoesClima = {
    0: "Céu limpo",
    1: "Predominantemente limpo",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Nevoeiro",
    48: "Nevoeiro com geada",
    51: "Garoa fraca",
    53: "Garoa moderada",
    55: "Garoa forte",
    61: "Chuva fraca",
    63: "Chuva moderada",
    65: "Chuva forte",
    71: "Neve fraca",
    73: "Neve moderada",
    75: "Neve forte",
    80: "Pancadas de chuva fracas",
    81: "Pancadas de chuva moderadas",
    82: "Pancadas de chuva fortes",
    95: "Trovoadas",
    96: "Trovoadas com granizo",
    99: "Trovoadas fortes com granizo"
  };

  function descreverClima(codigo) {
    return descricoesClima[codigo] || "Condição não identificada";
  }

  if (formClima) {
    formClima.addEventListener("submit", function (event) {
      event.preventDefault();

      const cidade = climaCidadeInput.value.trim();
      if (cidade.length === 0) {
        return;
      }

      climaMensagem.textContent = "Buscando previsão para " + cidade + "...";
      climaResultado.innerHTML = "";

      // guarda a cidade encontrada para usar no último .then
      let local = null;

      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`)
        .then((resposta) => resposta.json())
        .then((dadosGeo) => {
          if (!dadosGeo.results || dadosGeo.results.length === 0) {
            return null; // não achou a cidade: não há clima para buscar
          }

          local = dadosGeo.results[0];

          // buscar o clima atual para as coordenadas encontradas
          return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}&current_weather=true`);
        })
        .then((resposta) => (resposta ? resposta.json() : null))
        .then((dadosClima) => {
          if (!local) {
            climaMensagem.textContent = "Cidade não encontrada. Tente digitar de outra forma.";
            return;
          }

          const atual = dadosClima.current_weather;

          climaMensagem.textContent = "";
          climaResultado.innerHTML = `
            <div class="col-auto">
              <div class="clima-card text-center">
                <h5 class="fw-700 mb-1">${local.name}${local.admin1 ? " - " + local.admin1 : ""}</h5>
                <p class="mb-2 opacity-75">${local.country || ""}</p>
                <div class="temperatura">${Math.round(atual.temperature)}°C</div>
                <p class="mb-1">${descreverClima(atual.weathercode)}</p>
                <p class="mb-0 small opacity-75"><i class="bi bi-wind me-1"></i>Vento: ${atual.windspeed} km/h</p>
              </div>
            </div>`;
        })
        .catch(() => {
          climaMensagem.textContent = "Não foi possível consultar o clima agora. Tente novamente.";
        });
    });
  }

});