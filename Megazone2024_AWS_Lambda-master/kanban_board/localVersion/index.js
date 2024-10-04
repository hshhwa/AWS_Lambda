// api.js - AWS Lambda와 통신하는 APIHandler
class APIHandler {
  constructor() {
    this.apiBaseUrl =
      "https://pvsclpsi57.execute-api.ap-northeast-2.amazonaws.com";
  }

  // Lambda에서 카드 정보 불러오기
  async getCards() {
    try {
      var response = await fetch(`${this.apiBaseUrl}/cards`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      // JSON 데이터를 받아옵니다.
      var cards = await response.json();
      console.log(cards);
      // 카드가 존재하는지 확인 후, 카드 객체를 생성합니다.
      if (cards && cards.length > 0) {
        cards.forEach((card) => {
          let cardObj = new Card(null, card.title, card.id, card.category);
          console.log(cardObj);
          cardFactory(cardObj);
        });
      }
      console.log("return : " + cards);
    } catch (error) {
      console.error("불러오기 오류:", error);
    }
  }

  // Lambda로 카드 등록하기
  async registerCard(cardObj) {
    try {
      let cardId = new Date().getTime().toString();

      const response = await fetch(`${this.apiBaseUrl}/cards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cardObj.id || cardId, // Lambda가 id를 사용하므로 임시로 생성
          title: cardObj.title,
          category: cardObj.category,
        }),
      });
      cardObj.cardElement.id = "card-id-" + cardId;
      // const data = await response.json();
      // return cardObj.id || data.id; // 등록된 카드의 ID 반환
    } catch (error) {
      console.error("생성오류:", error);
    }
  }

  // Lambda로 카드 업데이트하기
  async updateCard(cardObj) {
    try {
      await fetch(`${this.apiBaseUrl}/cards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cardObj.id,
          title: cardObj.title,
          category: cardObj.category,
        }),
      });
    } catch (error) {
      console.error("업데이트 오류:", error);
    }
  }

  // Lambda로 카드 삭제하기
  async deleteCard(cardObj) {
    try {
      // 카드 요소를 이벤트의 부모 노드에서 가져오기
      const cardElement = cardObj.target.parentNode; // 삭제 버튼의 부모가 카드 요소
      const cardId = cardElement.id.replace("card-id-", ""); // 카드 ID 추출

      console.log(cardId);
      if (!cardId) {
        console.error("카드 ID가 없는데요");
        return;
      }

      // 올바른 카드 ID를 사용해 삭제 요청 보내기
      const response = await fetch(`${apiHandler.apiBaseUrl}/cards/${cardId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        cardElement.remove(); // 카드 요소 삭제
      } else {
        console.error("삭제실패 : ", response.statusText);
      }
    } catch (error) {
      console.error("삭제오류 : ", error);
    }
  }
}

// 카드 클래스
const apiHandler = new APIHandler();

class Card {
  constructor(cardElement, title, id, category) {
    this.cardElement = cardElement;
    this.title = title;
    this.id = id;
    this.category = category;
  }
}

// 전체 카드 카테고리 요소 반환
const getCardContainers = () => {
  return document.querySelectorAll(".card-container");
};

// 카드 요소에서 카드 객체 반환
const getCardInfo = (cardElement) =>
  new Card(
    cardElement,
    cardElement.children[1].value,
    cardElement.id.replace("card-id-", ""),
    cardElement.parentNode.parentNode.getAttribute("data-card-category")
  );

// 카드 드래그 앤 드랍 시작 이벤트. 카테고리 이름 & 카드 ID 저장. 이동가능 영역 표시
const ondragstart = (event) => {
  let currentColumnType =
    event.target.parentNode.parentNode.getAttribute("data-card-category");
  getCardContainers().forEach((element) => {
    if (
      element.parentNode.getAttribute("data-card-category") !==
      currentColumnType
    )
      element.classList.add("hoverable");
  });
  event.dataTransfer.setData("columnType", currentColumnType);
  event.dataTransfer.setData("cardID", event.target.id);
};

// 카드 온드랍 이벤트. 카테고리 이동
const cardOnDrop = (event) => {
  event.target.classList.remove("hover");
  let from = event.dataTransfer.getData("columnType");
  let to = event.target.parentNode.getAttribute("data-card-category");
  let id = event.dataTransfer.getData("cardID");
  let card = document.getElementById(id);
  if (from && to && card && from !== to) {
    event.target.appendChild(card);
    apiHandler.updateCard(getCardInfo(card));
  }
};

// 카드 드래그 앤 드랍 종료 이벤트. 이동가능 영역 표시 CSS class 제거
const ondragend = (event) => {
  getCardContainers().forEach((element) => {
    element.classList.remove("hoverable");
  });
};

// 새로운 카드 생성 이벤트.
const createCard = (event) => {
  let category = event.target.parentNode.getAttribute("data-card-category");
  let cardObj = new Card(null, null, null, category);
  cardFactory(cardObj);
};

// 기존/신규 카드 요소 생성. 이후 onChangeCard() 트리거
const cardFactory = (cardObj) => {
  let cardElement = document.createElement("div");
  cardElement.className = "card";
  cardElement.ondragstart = ondragstart;
  cardElement.ondragend = ondragend;
  cardElement.setAttribute("draggable", true);
  if (cardObj.id) cardElement.id = "card-id-" + cardObj.id;

  let title = document.createElement("textarea");
  title.setAttribute("rows", 3);
  title.setAttribute("cols", 1);
  title.setAttribute("name", "title");
  title.className = "card-title";
  title.onchange = onChangeCard;
  if (cardObj.title) title.value = cardObj.title;

  let del = document.createElement("div");
  del.innerHTML = "x";
  del.className = "card-delete";
  del.onclick = apiHandler.deleteCard;

  cardElement.appendChild(del);
  cardElement.appendChild(title);

  let cardContainer = document
    .querySelectorAll(`[data-card-category='${cardObj.category}']`)[0]
    .querySelector(".card-container");
  console.log("cardContainer : " + cardContainer);
  cardContainer.appendChild(cardElement);
  title.focus();
};

// 카드 생성/업데이트 컨트롤러
const onChangeCard = (event) => {
  let title = event.target.value.trim();
  let cardElement = event.target.parentNode;
  let cardObj = getCardInfo(cardElement);
  if (title.length > 0 && cardElement.id === "") {
    apiHandler.registerCard(cardObj);
  } else if (title.length > 0 && cardElement.id !== "") {
    apiHandler.updateCard(cardObj);
  } else {
    card.remove(); // 입력된 내용이 없으면 카드 생성 취소
  }
};

// 드래그 앤 드랍 이벤트 등록
(() => {
  window.createCard = createCard;
  getCardContainers().forEach((element) => {
    element.ondragenter = (event) => event.target.classList.add("hover");
    element.ondragleave = (event) => event.target.classList.remove("hover");
    element.ondragover = (event) => event.preventDefault();
    element.ondrop = cardOnDrop;
  });
  apiHandler.getCards();
})();
