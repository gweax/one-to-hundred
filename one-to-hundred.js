var Utils = {
  formatTime: function(timeInSeconds) {
    var min = Math.floor(timeInSeconds / 60);
    var sec = Math.floor(timeInSeconds % 60);

    return min + ":" + (sec < 10 ? "0" : "") + sec;
  }
};

var Config = {
  size: 100,

  init: function () {
    this.size = this._getSize();
    this.time = this._getTime() || this._getDefaultTime(this.size);

    document.title = "1 to " + this.size;
  },

  _getSize: function() {
    var match = location.search.match(/size=(\d+)/);
    return Math.min(225, (match && Number(match[1])) || 100);
  },

  _getTime: function() {
    var match = location.search.match(/time=(\d+)/);
    return (match && Number(match[1]));
  },

  _getDefaultTime: function(size) {
    var sqrt = Math.sqrt(size);

    if (sqrt >= 7) {
      return Math.floor(10 * (Math.pow(sqrt - 6, 2) + 8));
    }
  
    if (sqrt >= 4) {
      return Math.floor(30 + 20 * (sqrt - 4));
    }
  
    return Math.floor(7.5 * sqrt);
  }
};

var Events = {
  _handlers: {},

  on: function(name, callback) {
    if (!this._handlers.hasOwnProperty(name)) {
      this._handlers[name] = [];
    }

    this._handlers[name].push(callback);
  },

  trigger: function(name, data) {
    console.log("Events.trigger %s", name);

    if (this._handlers.hasOwnProperty(name)) {
      this._handlers[name].forEach(function(callback) {
        try {
          callback(data);
        } catch (ignore) {}
      });
    }
  }
};

var Game = {
  _element: null,
  _state: "stopped",

  init: function(element) {
    this._element = element;
    this._element.disabled = false;
    this._element.addEventListener("click", this.handleClick.bind(this), false);

    Events.on("countdown.end", this.stop.bind(this));
    Events.on("step.error", this.stop.bind(this));
    Events.on("step.all", this.stop.bind(this));
  },

  handleClick: function() {
    if (this._state === "stopped") {
      this.start();
    } else if (this._state === "playing") {
      this.pause();
    } else if (this._state === "paused") {
      this.resume();
    }
  },

  start: function() {
    this._element.innerHTML = "Pause";
    this._state = "playing";
    Events.trigger("game.start");
  },

  stop: function() {
    this._element.innerHTML = "Play";
    this._state = "stopped";
    Events.trigger("game.end");
  },

  pause: function() {
    this._element.innerHTML = "Resume";
    this._state = "paused";
    Events.trigger("game.pause");
  },

  resume: function() {
    this._element.innerHTML = "Pause";
    this._state = "playing";
    Events.trigger("game.resume");
  }
};

var Counter = {
  _element: null,
  value: 0,

  init: function(element) {
    this._element = element;

    Events.on("game.start", this.start.bind(this));
    Events.on("step.ok", this.handleStep.bind(this));
  },

  start: function() {
    this.value = 0;
    this.render();
  },

  handleStep: function(value) {
    this.value = value;
    this.render();
  },

  render: function() {
    this._element.innerHTML = this.value;
  }
};

var Countdown = {
  _element: null,
  _duration: 0,
  _lastTime: undefined,
  timePassed: 0,
  _timerId: null,
  _timeLeft: undefined,

  init: function(element, seconds) {
    this._element = element;
    this._duration = 1000 * Math.max(0, Math.floor(seconds));
    this.render();

    Events.on("game.start", this.start.bind(this));
    Events.on("game.end", this.stop.bind(this));
    Events.on("game.pause", this.pause.bind(this));
    Events.on("game.resume", this.resume.bind(this));
  },

  start: function() {
    this._paused = false;
    this._lastTime = undefined;
    this.timePassed = 0;
    this._timeLeft = undefined;
    this._timerId = requestAnimationFrame(this.step.bind(this));
  },

  stop: function() {
    cancelAnimationFrame(this._timerId);
  },

  pause: function() {
    this._paused = true;
  },

  resume: function() {
    this._paused = false;
    this._lastTime = undefined;
    this._timerId = requestAnimationFrame(this.step.bind(this));
  },

  step: function(timestamp) {
    if (typeof this._lastTime !== "undefined") {
      this.timePassed += timestamp - this._lastTime;
    }

    this._lastTime = timestamp;

    this.render();

    if (this.timePassed <= this._duration) {
      if (!this._paused) {
        this._timerId = requestAnimationFrame(this.step.bind(this));
      }
    } else {
      Events.trigger("countdown.end");
    }
  },

  render: function() {
    var timeLeftInSeconds = Math.max(
        0,
        Math.ceil((this._duration - this.timePassed) / 1000)
      );

    if (timeLeftInSeconds !== this._timeLeft) {
      this._element.innerHTML = Utils.formatTime(timeLeftInSeconds);
      this._timeLeft = timeLeftInSeconds;
    }
  },

  getProgress: function() {
    return this.timePassed / this._duration;
  }
};

var Area = {
  _size: 100,
  _element: null,
  _last: 0,
  _stopped: true,

  init: function(element, size) {
    var fragment = document.createDocumentFragment();

    this._element = element;
    this._size = size;

    for (var i = 1, len = this._size; i <= len; i++) {
      var button = document.createElement("button");
      button.type = "button";
      button.appendChild(document.createTextNode(i));

      fragment.appendChild(button);
    }

    element.appendChild(fragment);
    element.addEventListener("click", this.handleClick.bind(this), false);

    Events.on("game.start", this.start.bind(this));
    Events.on("game.end", this.stop.bind(this));
    Events.on("game.pause", this.pause.bind(this));
    Events.on("game.resume", this.resume.bind(this));
  },

  start: function() {
    this._last = 0;
    this._stopped = false;

    // enable all buttons
    Array.apply(
      null,
      this._element.querySelectorAll("button")
    ).forEach(function(el) {
      el.disabled = false;
    });

    // shuffle all enabled buttons
    this.shuffle();
  },

  stop: function() {
    this._stopped = true;
  },

  pause: function() {
    this._element.classList.add("is-paused");
  },

  resume: function() {
    this._element.classList.remove("is-paused");

    // shuffle all enabled buttons
    this.shuffle();
  },

  shuffle: function() {
    var buttons, numbers, i, len, rnd, tmp;

    buttons = Array.apply(
      null,
      this._element.querySelectorAll("button:not([disabled])")
    );

    numbers = buttons.map(function(el, i) {
      return el.style.order || el.style.webkitOrder || i;
    });

    for (i = 0, len = numbers.length; i < len; i++) {
      rnd = Math.floor(Math.random() * len);
      tmp = numbers[i];
      numbers[i] = rnd;
      numbers[rnd] = tmp;
    }

    buttons.forEach(function(el, i) {
      el.style.order = numbers[i];
      el.style.webkitOrder = numbers[i];
    });
  },

  handleClick: function(event) {
    if (this._stopped) {
      return;
    }

    var button = event.target,
      current;

    if (button.nodeName === "BUTTON") {
      current = parseInt(button.innerHTML, 10);

      if (current === this._last + 1) {
        this._last = current;

        Events.trigger("step.ok", this._last);

        button.disabled = true;
      } else {
        Events.trigger("step.error");
      }

      if (this._last === this._size) {
        Events.trigger("step.all");
      }
    }
  },

  getProgress: function() {
    return this._last / this._size;
  }
};

var Stats = {
  _element: null,
  _progress: [],
  _lastPath: "",
  _lastProgressLength: 0,
  _stopped: false,

  init: function(element) {
    this._element = element;

    Events.on("game.start", this.start.bind(this));
    Events.on("game.end", this.stop.bind(this));
    Events.on("step.ok", this.step.bind(this));
    Events.on("game.pause", this.pause.bind(this));
    Events.on("game.resume", this.resume.bind(this));
  },

  start: function() {
    this._progress = [];
    this._lastPath = "";
    this._lastProgressLength = 0;
    this._stopped = false;

    requestAnimationFrame(this.render.bind(this));
  },

  stop: function() {
    this._stopped = true;
  },

  pause: function() {
    this._stopped = true;
  },

  resume: function() {
    this._stopped = false;
    requestAnimationFrame(this.render.bind(this));
  },

  step: function() {
    this._progress.push({
      step: Area.getProgress(),
      time: Countdown.getProgress()
    });
  },

  render: function() {
    var origin, liveProgress, coords, lines, path, area, color;

    origin = {
      x: 0,
      y: 1000
    };

    function progressToPoint(data) {
      // get point in a (0,0) to (1000,1000) based system
      return {
        x: 1000 * data.time,
        y: 1000 * data.step
      };
    }

    function pointToCoords(point) {
      // transform in relation to origin
      return {
        x: Math.floor(origin.x + point.x),
        y: Math.floor(origin.y - point.y)
      };
    }

    function coordsToLines(coords, i, arr) {
      var prevY = i > 0 ? arr[i - 1].y : origin.y;

      var horizontal = " L " + coords.x + "," + prevY,
        vertical = " L " + coords.x + "," + coords.y;

      return horizontal + vertical;
    }

    liveProgress = {
      step: Area.getProgress(),
      time: Countdown.getProgress()
    };

    lines = this._progress
      .concat(liveProgress)
      .map(progressToPoint)
      .map(pointToCoords)
      .map(coordsToLines);

    path = "M " + origin.x + "," + origin.y + lines.join("");

    var liveX = pointToCoords(progressToPoint(liveProgress)).x;
    area = path + " L " + liveX + "," + origin.y;

    color = liveProgress.time > liveProgress.step ? "#ffcccc" : "#9ebd4f";

    this._element.querySelector("#line").setAttribute("d", path);
    this._element.querySelector("#area").setAttribute("d", area);
    this._element.querySelector("#area").setAttribute("fill", color);

    if (!this._stopped) {
      requestAnimationFrame(this.render.bind(this));
    }
  }
};

var Feedback = {
  init: function() {
    if (navigator.vibrate) {
      Events.on("step.ok", this.okFeedback);
      Events.on("step.error", this.errorFeedback);
    }
  },

  okFeedback: function() {
    navigator.vibrate(50);
  },

  errorFeedback: function() {
    navigator.vibrate(300);
  }
};

var Highscore = {
  _scores: {},

  init: function() {
    var scores = localStorage.getItem("scores");

    if (scores) {
      try {
        this._scores = JSON.parse(scores);
      } catch (e) {}
    }

    Events.on("game.end", this.showHighscore.bind(this));
  },

  showHighscore: function () {
    var value, time, score, finishedBefore, succeeded, message;

    value = Counter.value;
    time = Countdown.timePassed;
    score = this._scores[Config.size] || {};
    finishedBefore = typeof score.time === "number";
    succeeded = value === Config.size;

    if (succeeded) {
      if (!score.time || time < score.time) {
        message = finishedBefore
          ? "New highscore! " + Utils.formatTime(time / 1000) + "s, before " + Utils.formatTime(score.time / 1000) + "s"
          : "Congrats! You succeeded for the first time";

        alert(message);
        this.setHighscore(value, time);
      }
    } else {
      if (!score.value || value > score.value) {
        message = score.value
          ? "New highscore! " + value + ", before " + score.value
          : Countdown.getProgress() > 0.75
            ? "Well done!"
            : "Nice first try!";

        alert(message);
        this.setHighscore(value);
      }
    }
  },

  setHighscore: function (value, time) {
    this._scores[Config.size] = {
      value: value,
      time: time ? Math.floor(time) : undefined
    };

    localStorage.setItem("scores", JSON.stringify(this._scores));
  }
};

Config.init();
Stats.init(document.querySelector(".graph"));
Counter.init(document.querySelector("#counter"));
Countdown.init(document.querySelector("#countdown"), Config.time);
Area.init(document.querySelector(".area"), Config.size);
Game.init(document.querySelector(".start-button"));
Feedback.init();
Highscore.init();
