export function showModal(content) {
  $('<div>', {
    class: 'modal',
    html: $('<div>', {
      class: 'modal-content',
      html: content
    })
  }).appendTo($('#jspsych-target'));
};

export function completeModal(md) {
  let resolve;
  let promise = new Promise(function(res, rej) {
    resolve = res;
  });
  const button = $('<button>', {
    class: 'btn btn-success',
    text: 'Continue',
    click: function() {
      $('.modal').remove();
      resolve();
    }
  });
  showModal($('<div>')
    .add($('<div>', {html: markdown(md)}))
    .add(button)
  );
  // When focused, participant can hit enter to proceed.
  button[0].focus();
  return promise;
}

export function SetIsEqual(a, b) {
  // https://stackoverflow.com/questions/31128855/comparing-ecma6-sets-for-equality
  if (a.size !== b.size) {
    return false;
  }
  for (let item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}

export const graphics = [
/*
  '🎈','🔑','🎀','🎁','🛒','📚','📌','✏️','🔮','🔨','💰','⚙️','💎','💡','⏰','🚲',
  '✈️','🎣','🍫','🍎','🧀','🍌','🍪','🌞','⛄️','🐒','🐳','👑','👟','🤖','🤡',
*/
  '🎈','🔑','🎀','🎁','📌','✏️','🔮','💰','⚙️','💎','💡','⏰',
  '✈️','🍫','🍎','🧀','🍪','🌞','⛄️', '🐒','👑','👟', '🤖','🤡',
];

export function graphicsUrl(emoji) {
  const fn = emoji.codePointAt(0).toString(16).toUpperCase() + '.svg';
  return "static/optdisco/images/openmoji/" + fn;
}

function loadImage(src) {
  // https://stackoverflow.com/questions/52059596/loading-an-image-on-web-browser-using-promise
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", err => reject(err));
    img.src = src;
  });
};

const images = graphics.map(function(emoji) {
  return loadImage(graphicsUrl(emoji));
});

export const graphicsLoading = Promise.all(images);

export function trialErrorHandling(trial) {
  return async function() {
    return trial.apply(this, arguments).catch(handleError);
  };
};

export function addPlugin(name, func) {
  jsPsych.plugins[name] = {
    info: { name: name, parameters: {} },
    trial: trialErrorHandling(func),
  };
}

export function parseHTML(html) {
  var parser = new DOMParser();
  var parsed = parser.parseFromString(html, 'text/html');
  return parsed.getRootNode().body;
}

export function setTimeoutPromise(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
