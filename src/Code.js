function main() {
  updateCalendar('sa15u0k6h8vgcm4uth4uvksano@group.calendar.google.com',
    'http://content.warframe.com/dynamic/worldState.php');
}

var nightMs = 50 * 60 * 1000;

function updateCalendar(calendarId, url) {
  var cal = CalendarApp.getCalendarById(calendarId);
  var resp = UrlFetchApp.fetch(url);

  if (resp.getResponseCode() != 200) {
    throw resp;
  }

  var ws = JSON.parse(resp.getContentText());
  var s = jp.value(ws, '$.SyndicateMissions[?(@.Tag==\'CetusSyndicate\')]');
  var expiry = parseInt(s['Expiry']['$date']['$numberLong'], 10);

  const horizon = 3 * 7 * 24 * 60 * 60 * 1000;

  var timestamps = {};
  var t = getNightTimestamps(expiry, expiry + horizon);
  for (var i = 0; i < t.length; i++) {
    timestamps[t[i]] = false;
  }

  var events = cal.getEvents(new Date(expiry + 5000), new Date(expiry + horizon + 5000));
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var ts = e.getTag('ts');
    if (!ts) {
      e.deleteEvent();
      continue;
    }
    if (!timestamps.hasOwnProperty(ts)) {
      console.warn({
        message: "Deleting event with mismatching timestamp",
        event_ts: ts,
        calendar: calendarId
      });
      e.deleteEvent();
      continue;
    }
    if (timestamps[ts]) {
      // Duplicate.
      console.warn({
        message: "Deleting duplicate event",
        event_ts: ts,
        calendar: calendarId
      });
      e.deleteEvent();
      continue;
    }
    timestamps[ts] = true;
  }

  for (var ts in timestamps) {
    if (timestamps[ts]) continue;
    var x = parseInt(ts, 10);
    console.info({
      message: "Creating new event",
      event_ts: ts,
      calendar: calendarId
    })
    cal.createEvent('Night', new Date(x), new Date(x + nightMs)).setTag('ts', ts);
  }
}

function makeSequence() {
  const baseCycleMs = 8998875;
  var seq = [];
  var x4 = [baseCycleMs, baseCycleMs, baseCycleMs, baseCycleMs, baseCycleMs - 1];
  var x5 = [baseCycleMs, baseCycleMs, baseCycleMs, baseCycleMs, baseCycleMs, baseCycleMs - 1];
  Array.prototype.push.apply(seq, x4);
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 11; j++) {
      Array.prototype.push.apply(seq, x4);
    }
    Array.prototype.push.apply(seq, x5);
  }
  return seq;
}

function getNightTimestamps(currentExpiry, until) {
  const baseCycleMs = 8998875;
  var seq = makeSequence();
  var sum = 0;
  seq.forEach(function(d) {
    sum += d;
  });

  const seqStart = 1547358223195; // from empirical data.

  var currentSeqStart = seqStart;
  while (currentSeqStart + sum < currentExpiry) currentSeqStart += sum;

  var index = 0;
  var ts = currentSeqStart;
  var timestamps = [];
  while (true) {
    ts += seq[index % seq.length];
    index++;
    if (ts - nightMs < currentExpiry) continue;
    if (ts - nightMs > until) break;

    // Prediction check. If we're not hitting the exact millisecond, our model is wrong.
    // Note that we proceed anyway, because, unless cycle length changes drastically,
    // we should be still accurate enough for all practical purposes.
    if (Math.abs(ts - currentExpiry) < baseCycleMs / 2 && ts !== currentExpiry) {
      console.error({
        message: "Our prediction are not accurate",
        predictedExpiry: ts,
        actualExpiry: currentExpiry
      });
    }

    timestamps.push(ts - nightMs);
  }
  return timestamps;
}
