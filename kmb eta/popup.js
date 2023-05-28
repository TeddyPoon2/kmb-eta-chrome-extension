//storge user inputed route matched with fetched route data
let matchedRoute = [];
//storge user selected route direction all stops infomation
let selectedRouteStop = [];

//shortcut for console log
const print = (msg) => {
  console.log(msg);
};

//fetch whole kmb route data and check is the inputed route from user exist or show no route found
const getRouteInfo = async (input) => {
  //clear previousd Route first
  matchedRoute = [];

  let res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route/`);
  let route = await res.json();
  route = route.data;

  route.forEach((routeInfo) => {
    if (routeInfo.route === input) {
      matchedRoute.push(routeInfo);
    }
  });

  //if user entered correct route, display its direction and let user select
  if (matchedRoute.length != 0) {
    genRouteDirSelectBtn(matchedRoute);
    document.querySelector("#status").innerText = `${input}號`;
  } else {
    //if user entered a route that cannot be found, return err msg
    document.querySelector("#status").innerText = "查無此路線";
  }
};

//if the inputed route is correct, let user choose the direction of the route
const genRouteDirSelectBtn = (matchedRoute) => {
  let dirBtnHolder = document.querySelector(".routeDisplay");

  matchedRoute.forEach((routeInfo, index) => {
    dirBtnHolder.innerHTML += `<button type="button" class="fetchedRouteBtn" value="${index}"><span>${routeInfo.orig_tc} 往 ${routeInfo.dest_tc}方向</span></button>`;
  });

  //add button onclick event, let user select route direction
  Array.from(document.getElementsByClassName("fetchedRouteBtn")).forEach(
    (nodeElm) => {
      nodeElm.addEventListener(
        "click",
        function (event) {
          event.preventDefault();

          //after select a route direction, return corresponding index in matchedRoute[]
          let selectedDirInfo = matchedRoute[this.value];
          document.querySelector(
            "#status"
          ).innerText = `往 ${selectedDirInfo.dest_tc}方向`;
          document.querySelector(".routeDisplay").innerHTML = "";

          getStopId(matchedRoute, this.value);
        },
        false
      );
    }
  );
};

//fetch stops data from user choosed route direction
const getStopId = async (matchedRoute, selectedRouteIndex) => {
  selectedRouteStop = [];
  let selectedDir = matchedRoute[selectedRouteIndex];
  let dir = "";

  if (selectedDir.bound === "O") {
    dir = "outbound";
  } else if (selectedDir.bound === "I") {
    dir = "inbound";
  }

  let res = await fetch(
    `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${selectedDir.route}/${dir}/${selectedDir.service_type}`
  );
  let allStops = await res.json();
  allStops = allStops.data;

  allStops.forEach((stopInfo) => {
    selectedRouteStop.push(stopInfo);
  });

  await replaceStopName(selectedRouteStop);

  await getETA(selectedDir, selectedRouteStop);
};

//replace stop id in user choosed route direction data with corresponding name from fetching whole kmb stop data(only this api have stop full name)
const replaceStopName = async (selectedRouteAllStops) => {
  //get whole stop info
  let res = await fetch("https://data.etabus.gov.hk/v1/transport/kmb/stop");
  let wholeStopsData = await res.json();
  wholeStopsData = wholeStopsData.data;

  //replace the selected route stop id with it corresponding name
  wholeStopsData.forEach((wholeStopsInfo) => {
    selectedRouteAllStops.forEach((selectedRouteStopsInfo) => {
      if (selectedRouteStopsInfo.stop === wholeStopsInfo.stop) {
        selectedRouteStopsInfo.stop = wholeStopsInfo.name_tc;
      }
    });
  });
};

//fetch and filter estimated time of arrival of user select route and its direction
const getETA = async (selectedDir, selectedRouteStop) => {
  let etaRes = await fetch(
    `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${selectedDir.route}/${selectedDir.service_type}`
  );
  let selectedRuoteAllStopsETA = await etaRes.json();
  selectedRuoteAllStopsETA = selectedRuoteAllStopsETA.data;

  // print(selectedRuoteAllStopsETA);
  selectedRouteStop.forEach((Stops) => {
    genShowETABtn(Stops);

    selectedRuoteAllStopsETA.forEach((StopsETA) => {
      if (
        Stops.bound == StopsETA.dir &&
        Stops.service_type == StopsETA.service_type &&
        Stops.seq == StopsETA.seq
      ) {
        genETAinfo(StopsETA);
      }
    });
  });
};

//gen each stop button to show its estimated time of arrival in html
const genShowETABtn = (Stops) => {
  document.querySelector(
    ".stopDisplay"
  ).innerHTML += `<button class="collapsible stop timeline"><span>${Stops.stop}</span></button><div class="content" id="seq${Stops.seq}"></div>`;
  addEvent(Stops);
};

//gen each stop estimated time of arrival in html
const genETAinfo = (StopsETA) => {
  if (StopsETA.eta === null) {
    document.getElementById(
      `seq${StopsETA.seq}`
    ).innerHTML += `<span class="eta">暫沒有預定班次</span>`;
  } else {
    document.getElementById(
      `seq${StopsETA.seq}`
    ).innerHTML += `<span class="eta"><span class="blue">${diffInMinutes(
      StopsETA
    )}</span>分鐘</span>`;
  }
};

//get user input route
const getInfo = (event) => {
  event.preventDefault();

  //clear previous search result, if any
  document.querySelector(".routeDisplay").innerHTML = "";
  document.querySelector(".stopDisplay").innerHTML = "";

  let input = document.querySelector("#routeInput").value.toUpperCase();
  getRouteInfo(input);
};

const addEvent = () => {
  var coll = document.getElementsByClassName("collapsible");

  for (let i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  }
};

//calculate the estimated time of arrival in minutes using fetched timestamp data
const diffInMinutes = (StopsETA) => {
  let currentTimeStamp = new Date(StopsETA.data_timestamp).getTime();
  let etaTimeStamp = new Date(StopsETA.eta).getTime();

  return Math.abs(Math.round((etaTimeStamp - currentTimeStamp) / 60000));
};

//search button onclick action
document.getElementById("inputBtn").addEventListener("click", getInfo, false);

//input text enter key action
document
  .getElementById("routeInput")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      getInfo(event);
    }
  });
