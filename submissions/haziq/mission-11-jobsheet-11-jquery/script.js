// Student Task Manager - jQuery Project
$(document).ready(function () {

  var STORE_KEY = "jobsheet13Tasks";
  var tasks = [];          // { id, text, priority, done }
  var currentFilter = "all";

  /* ---------- Storage (safe: works even if storage is blocked) ---------- */
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); } catch (e) { }
  }
  function load() {
    try {
      var data = localStorage.getItem(STORE_KEY);
      if (data) { tasks = JSON.parse(data); return; }
    } catch (e) { }
    tasks = [
      { id: 1, text: "Finish jQuery Job Sheet 13", priority: "high", done: false },
      { id: 2, text: "Revise HTML and CSS notes", priority: "medium", done: false },
      { id: 3, text: "Submit assignment to lecturer", priority: "low", done: true }
    ];
  }

  /* ---------- Rendering ---------- */
  function render() {
    var $list = $("#taskList").empty();
    $.each(tasks, function (i, t) {
      var $li = $("<li></li>")
        .attr("data-id", t.id)
        .addClass(t.priority)
        .toggleClass("done", t.done);
      $("<input type='checkbox' class='chk'>").prop("checked", t.done).appendTo($li);
      $("<span class='text'></span>").text(t.text).appendTo($li);
      $("<span class='tag'></span>").text(t.priority).appendTo($li);
      $("<button type='button' class='del'>X</button>").appendTo($li);
      $list.append($li);
    });
    applyView();
  }

  function applyView() {
    var keyword = $.trim($("#searchInput").val()).toLowerCase();
    var visible = 0;
    $("#taskList li").each(function () {
      var $li = $(this);
      var isDone = $li.hasClass("done");
      var matchFilter = currentFilter === "all" ||
                        (currentFilter === "done" && isDone) ||
                        (currentFilter === "active" && !isDone);
      var text = $li.find(".text").text().toLowerCase();
      var matchSearch = keyword === "" || text.indexOf(keyword) !== -1;
      $li.toggle(matchFilter && matchSearch);
      if (matchFilter && matchSearch) { visible++; }
    });
    $("#emptyMsg").toggle(visible === 0);
    updateCounter();
  }

  function updateCounter() {
    var total = tasks.length;
    var done = $.grep(tasks, function (t) { return t.done; }).length;
    $("#counter").text(
      "Total: " + total + "  |  Active: " + (total - done) + "  |  Done: " + done
    );
  }

  function showMessage(text) {
    $("#message").text(text).stop(true, true).fadeIn(150).delay(1800).fadeOut(400);
  }

  /* ---------- Add task ---------- */
  function addTask() {
    var text = $.trim($("#taskInput").val());
    if (text === "") {
      showMessage("Please enter a task first.");
      $("#taskInput").focus();
      return;
    }
    var id = Date.now();
    tasks.push({ id: id, text: text, priority: $("#priority").val(), done: false });
    save();
    render();
    $("#taskList li[data-id='" + id + "']").hide().slideDown(250);
    $("#taskInput").val("").focus();
  }

  $("#addBtn").click(addTask);
  $("#taskInput").keypress(function (e) {
    if (e.which === 13) { addTask(); }
  });

  /* ---------- Complete / delete (event delegation) ---------- */
  $("#taskList").on("change", ".chk", function () {
    var id = $(this).closest("li").data("id");
    $.each(tasks, function (i, t) { if (t.id === id) { t.done = !t.done; } });
    $(this).closest("li").toggleClass("done");
    save();
    applyView();
  });

  $("#taskList").on("click", ".del", function () {
    var $li = $(this).closest("li");
    var id = $li.data("id");
    $li.slideUp(250, function () {
      tasks = $.grep(tasks, function (t) { return t.id !== id; });
      save();
      render();
    });
  });

  /* ---------- Filter and search ---------- */
  $("#filters").on("click", ".filterBtn", function () {
    $(".filterBtn").removeClass("active");
    $(this).addClass("active");
    currentFilter = $(this).data("filter");
    applyView();
  });

  $("#searchInput").keyup(applyView);

  /* ---------- Clear completed ---------- */
  $("#clearDone").click(function () {
    var doneCount = $.grep(tasks, function (t) { return t.done; }).length;
    if (doneCount === 0) {
      showMessage("No completed tasks to clear.");
      return;
    }
    $("#taskList li.done").fadeOut(250, function () {
      tasks = $.grep(tasks, function (t) { return !t.done; });
      save();
      render();
    });
  });

  /* ---------- Dark mode ---------- */
  $("#themeBtn").click(function () {
    $("body").toggleClass("dark");
    $(this).text($("body").hasClass("dark") ? "Light Mode" : "Dark Mode");
  });

  /* ---------- Start ---------- */
  load();
  render();
});
