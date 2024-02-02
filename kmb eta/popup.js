//storge user inputed route matched with fetched route data
let matchedRoute = [];
//storge user selected route direction all stops infomation
let selectedRouteStop = [];
//storge kmb whole stop data
let wholeStopsData = [];
//fave
let parsedStoredRoute = localStorage.getItem("favRoute");
//shortcut for console log
const print = (msg) => {
  console.log(msg);
};

if (parsedStoredRoute) {
  const favTitle = document.querySelector(".favTitle");
  const routeDisplay = document.querySelector(".routeDisplay");

  favTitle.style.display = "block";

  const sortedParsedStoredRoute = JSON.parse(parsedStoredRoute).sort(
    (a, b) => a - b
  );

  sortedParsedStoredRoute.forEach((route) => {
    const createDiv = document.createElement("div");
    createDiv.classList.add("favRoute");
    createDiv.innerHTML = `
      <img class="bin" data-route="${route}" src="./img/MaterialSymbolsDeleteOutline.svg" />
      <button type="button" class="favBtn" value="${route}">
        <span>${route}</span>
      </button>
    `;
    routeDisplay.appendChild(createDiv);
  });

  Array.from(document.getElementsByClassName("favBtn")).forEach((nodeElm) => {
    nodeElm.addEventListener("click", (event) => {
      event.preventDefault();
      getRouteInfo(nodeElm.value.toUpperCase());
    });
  });

  Array.from(document.getElementsByClassName("bin")).forEach((nodeElm) => {
    nodeElm.addEventListener("click", (event) => {
      event.preventDefault();
      toggleFav(nodeElm.dataset.route);
      nodeElm.parentElement.remove();
    });
  });
}

// fetch whole kmb route data and check is the inputed route from user exist or show no route found
const getRouteInfo = (input) => {
  document.getElementById("inputBtn").disabled = true;
  //clear previousd Route first
  matchedRoute = [];
  //clear previous search result, if any
  document.querySelector(".routeDisplay").innerHTML = "";
  document.querySelector(".stopDisplay").innerHTML = "";
  // Show loading animation
  document.querySelector("#loading").style.display = "block";
  document.querySelector(".favTitle").style.display = "none";

  setTimeout(async () => {
    try {
      let res = await fetch(
        `https://data.etabus.gov.hk/v1/transport/kmb/route/`
      );
      let route = await res.json();

      route.data.forEach((routeInfo) => {
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
        document.querySelector("#status").innerText = "查無此巴士號碼";
      }
    } catch (error) {
      document.querySelector("#status").innerText = "請稍後嘗試";
    } finally {
      document.getElementById("inputBtn").disabled = false;
      document.querySelector("#loading").style.display = "none";
    }
  }, 500);
};

//if the inputed route is correct, let user choose the direction of the route
const genRouteDirSelectBtn = (matchedRoute) => {
  let favRoute = localStorage.getItem("favRoute");
  let dirBtnHolder = document.querySelector(".routeDisplay");

  matchedRoute.forEach((routeInfo, index) => {
    dirBtnHolder.innerHTML += `
    <button type="button" class="fetchedRouteBtn" value="${index}">
    <span>${routeInfo.orig_tc} 往 ${routeInfo.dest_tc}方向</span>
    </button>`;
  });
  if (favRoute && favRoute.includes(matchedRoute[0].route)) {
    dirBtnHolder.innerHTML += `
    <button type="button" class="added grey">
    <span>已加入至常用路線</span>
    </button>`;
    document.querySelector(".added").disabled = true;
    document.querySelector(".added").style.cursor = "not-allowed";
  } else {
    dirBtnHolder.innerHTML += `
    <button type="button" class="favBtn" value="${matchedRoute[0].route}">
    <span>加入${matchedRoute[0].route}號至常用路線</span>
    </button>`;
  }

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

  Array.from(document.getElementsByClassName("favBtn")).forEach((nodeElm) => {
    nodeElm.addEventListener(
      "click",
      function (event) {
        event.preventDefault();
        toggleFav(this.value);
        this.innerHTML = `<span>已加入至常用路線</span>`;
        this.classList.remove("favBtn");
        this.classList.add("added", "grey");
        this.disabled = true;
        this.style.cursor = "not-allowed";
      },
      false
    );
  });
};

//fetch stops data from user choosed route direction
const getStopId = async (matchedRoute, selectedRouteIndex) => {
  // Show loading animation
  document.querySelector("#loading").style.display = "block";

  setTimeout(async () => {
    try {
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
    } catch (error) {
      document.querySelector("#status").innerText = "請稍後嘗試";
    } finally {
      document.querySelector("#loading").style.display = "none";
    }
  }, 500);
};

const getStopsInfo = async () => {
  let res = await fetch("https://data.etabus.gov.hk/v1/transport/kmb/stop");
  wholeStopsData = await res.json();
  wholeStopsData = wholeStopsData.data;
};

//replace stop id in user choosed route direction data with corresponding name from fetching whole kmb stop data(only this api have stop full name)
const replaceStopName = async (selectedRouteAllStops) => {
  if ((wholeStopsData = [])) {
    await getStopsInfo();
  }

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
  try {
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
  } catch (error) {
    document.querySelector("#status").innerText = "請稍後嘗試";
  }
};

//gen each stop button to show its estimated time of arrival in html
const genShowETABtn = (Stops) => {
  document.querySelector(".stopDisplay").innerHTML += `
  <button class="collapsible stop timeline">
  <span>${Stops.stop}</span>
  </button>
  <div class="content" id="seq${Stops.seq}"></div>`;
  addEvent();
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
        content.style.maxHeight = content.scrollHeight + 1 + "px";
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
const toggleFav = (route) => {
  let favRoute = JSON.parse(localStorage.getItem("favRoute") || "[]");
  if (favRoute.includes(route)) {
    if (favRoute.length === 1) {
      localStorage.removeItem("favRoute");
      document.querySelector(".favTitle").style.display = "none";
      return;
    } else {
      favRoute.splice(favRoute.indexOf(route), 1);
    }
  } else {
    favRoute.push(route);
  }
  localStorage.setItem("favRoute", JSON.stringify(favRoute));
};
