'use strict';

var TestRunReport = function() {
  this.summary = new TestSummary();
  this.startTime = Date.now();
  this.expendedReports = 0;
}
TestRunReport.prototype = {
  AUTOEXPEND_REPORTS_LIMIT: 30,

  render: function() {
    var div = this.element = document.createElement('div');
    div.appendChild(this.summary.render());

    return div;
  },
  appendResult: function(result) {
    var shouldExpend = this.expendedReports < this.AUTOEXPEND_REPORTS_LIMIT;

    var testReport = new TestReport(result);
    this.element.appendChild(testReport.render(shouldExpend));

    if (testReport.expended) {
      this.expendedReports++;
    }
    this.summary.update(testReport.getSummary());
  },
  reportFinish: function() {
    this.summary.reportFinish({
      time: (Date.now() - this.startTime)
    });
  }
};

var TestSummary = function() {
  this.summary = {};
  this.PROPS.forEach(function(prop) {
    this.summary[prop] = 0;
  }.bind(this));
}
TestSummary.prototype = {
  PROPS: Object.freeze(
    ['total', 'passed', 'failed',
      'mismatch', 'webfont', 'rendering', 'reference']),

  render: function() {
    this.element = document.createElement('p');
    this.element.className = 'summary';

    return this.element;
  },

  update: function(obj) {
    this.summary.total++;
    this.PROPS.forEach(function(prop) {
      if (obj[prop]) {
        this.summary[prop]++;
      }
    }.bind(this));

    this.element.textContent = this.PROPS.map(function(prop) {
        return prop + ': '  + this.summary[prop] }.bind(this)
      ).join(', ');
  },

  reportFinish: function(obj) {
    this.element.textContent += ', time: ' + obj.time + 'ms';
  }
};


var TestReport = function(result) {
  this.result = result;
  this.expended = false;
  this.detailRendered = false;
  this.passed = (result.svgRenderingMisMatchPercentage < this.MISMATCH_THRESHOLD) &&
    !result.isEqualToSystem &&
    !result.emojiRenderingEmpty &&
    !result.svgRenderingEmpty;
};

TestReport.prototype = {
  // In precentage
  MISMATCH_THRESHOLD: 1,

  render: function(canExpend) {
    var result = this.result;
    var reportEl = this.element = document.createElement('p');

    var reportTitleEl = document.createElement('span');
    reportTitleEl.className = 'title';
    reportTitleEl.addEventListener('click', this);
    reportTitleEl.classList.add('clickable');

    reportTitleEl.textContent =
      result.codePoints.map(function(cp) {
        var str = cp.toString(16);
        while (str.length < 4) {
          str = '0' + str;
        }
        return 'U+' + str;
      }).join(' ') + ', ' + result.string +
      ', reference: ' + !result.svgRenderingEmpty +
      ', rendering: ' + !result.emojiRenderingEmpty +
      ', webfont: ' + !result.isEqualToSystem +
      ', mismatch: ' + result.svgRenderingMisMatchPercentage.toFixed(2) + '%';
    reportEl.appendChild(reportTitleEl);

    if (this.passed) {
      reportEl.classList.add('passed');
    } else {
      reportEl.classList.add('failed');
    }

    if (!this.passed && canExpend) {
      this.element.classList.add('expended');
      this.expended = true;
      this.appendReportDOM();
    }

    return reportEl;
  },

  handleEvent: function(evt) {
    if (!this.detailRendered) {
      this.appendReportDOM();
    }

    if (!this.expended) {
      this.element.classList.add('expended');
      this.expended = true;
    } else {
      this.element.classList.remove('expended');
      this.expended = false;
    }

  },

  getSummary: function() {
    var result = this.result;
    return {
      passed: this.passed, failed: !this.passed,
      mismatch: (result.svgRenderingMisMatchPercentage >= this.MISMATCH_THRESHOLD),
      webfont: result.isEqualToSystem,
      rendering: result.emojiRenderingEmpty,
      reference: result.svgRenderingEmpty
    };
  },

  appendReportDOM: function(reportEl, result) {
    this.detailRendered = true;

    var detailEl = document.createElement('span');
    detailEl.className = 'detail';

    var result = this.result;

    var ref = document.createElement('span');
    ref.className = 'dom-ref';
    ref.textContent = result.string;
    ref.title = 'EmojiOne HTML rendering.';
    detailEl.appendChild(ref);

    detailEl.appendChild(result.svgRenderingCanvas);
    result.svgRenderingCanvas.title = 'Source SVG rendering on canvas.';
    if (result.svgRenderingEmpty) {
      result.svgRenderingCanvas.className = 'report-failed';
    }

    detailEl.appendChild(result.emojiRenderingCanvas);
    result.emojiRenderingCanvas.title = 'EmojiOne font rendering on canvas.';
    if (result.emojiRenderingEmpty) {
      result.emojiRenderingCanvas.className = 'report-failed';
    }

    detailEl.appendChild(result.systemRenderingCanvas);
    result.systemRenderingCanvas.title = 'System font rendering on canvas.';
    if (result.isEqualToSystem) {
      result.systemRenderingCanvas.className = 'report-failed';
    }

    detailEl.appendChild(result.svgRenderingDiffImg);
    result.svgRenderingDiffImg.title =
      'Diff between source SVG and font rendering on canvas.';
    if (result.svgRenderingMisMatchPercentage >= this.MISMATCH_THRESHOLD) {
      result.svgRenderingDiffImg.className = 'report-failed';
    }

    this.element.appendChild(detailEl);
  }
};
