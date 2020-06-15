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
      document.removeEventListener('keypress', handleEnter);
      resolve();
    }
  });
  showModal($('<div>')
    .add($('<div>', {html: markdown(md)}))
    .add(button)
  );

  // We 'click' button when enter is pressed.
  function handleEnter(e) {
    if (e.keyCode == 13) {
      button[0].click();
    }
  }
  document.addEventListener('keypress', handleEnter);
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

// Initially in https://jsfiddle.net/zoradude5/j4ogytfp/39/
function runTimerText(el, ms) {
  let resolve;
  const p = new Promise((res, rej) => { resolve = res; });

  const start = new Date();

  function update() {
    const elapsed = new Date() - start;

    // End once time is elapsed
    if (elapsed > ms+1) { // Make sure we go out past our time a bit, the 0.01 sec.
      // Clear interval! Important to end updates.
      clearInterval(inter);
      resolve();
    }

    // Render seconds: round up, and make sure we don't go below 0.
    const seconds = Math.max(0, Math.ceil((ms - elapsed) / 1000));

    // Update DOM
    el.textContent = (
      seconds == 0 ? 'Done!' :
      seconds == 1 ? '1 second left' :
      `${seconds} seconds left`
    );
  }

  // Set interval, every 100ms so we're never too late.
  const inter = setInterval(update, 100);
  // Run the first render manually.
  update();

  return p;
}

export function runTimer(root, ms) {
  // Render timer.
  root.innerHTML = `
  <div class="Timer-progressContainer"><div class="Timer-progress"></div></div>
  <span class="Timer-number"></span>
  `;

  // Animate progress bar.
  const el = root.querySelector('.Timer-progress')
  el.style.transitionDuration = `${ms}ms`;
  // Wait until next iter of event loop to make sure transition has right duration.
  setTimeout(() => {
    el.classList.add('progressing');
  }, 0);

  // Set text rendering. Also gives us a promise for completion.
  return runTimerText(root.querySelector('.Timer-number'), ms);
}
