Добавил для домена mir.utlik.pro достур на отправку

Страница с уже вставленным тестовым кодом ниже, который отправляет на тестовою среду заявку 
https://bir.by/test1243.html

Ссылка на конфиг в бпм
https://office.bir.by:6163/0/Nui/ViewModule.aspx#CardModuleV2/GeneratedWebFormPageV2/edit/cd8c698b-4b42-4a47-aaf4-7a9e72a0344b


Пример отправки кода, также в прикрепленном файле (сменить разрешение с txt на html ) 

<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js"></script>
<script src="https://files.cloudbpm.ru/Delivery/js/track-cookies.js"></script>
<script src="https://files.cloudbpm.ru/Delivery/js/create-object.js"></script>


<input type="text" id="Name" name="" value="Имя">
<input type="text" id="Code" name="" value="+37533">
<input type="text" id="Phone" name="" value="1234455">
<input type="text" id="Commentary" name="" value="Comments">
 
<button onclick="createObject()">Click Me</button>
<script>
/
* Замените выражение в кавычках "css-selector" в коде ниже значением селектора элемента на Вашей лендинговой странице.
* Вы можете использовать #id или любой другой CSS селектор, который будет точно определять поле ввода на Вашей лендинговой странице.
* Пример: "Email": "#MyEmailField".
* Если Ваша лендинговая страница не содержит одного или нескольких полей из приведенных ниже – оставьте строку без изменений или удалите полностью.
*/
var config = {
    fields: {
        "Name": "#Name", // Имя посетителя, заполнившего форму
        "Email": "css-selector", // Email посетителя
        "Zip": "css-selector", // Почтовый индекс посетителя
        "MobilePhone": "css-selector", // Телефон посетителя
        "Company": "css-selector", // Название компании
        "Industry": "css-selector", // Отрасль компании
        "FullJobTitle": "css-selector", // Должность посетителя
        "UseEmail": "css-selector", // Логическое значение «да» - согласие посетителя получать email рассылки
        "City": "css-selector", // Город
        "Country": "css-selector", // Страна
        "Commentary": "#Commentary", // Примечание
        "UsrProject": "css-selector", // Проект
        "UsrPropertyType": "css-selector", // Тип недвижимости
        "UsrNumberRooms": "css-selector", // Количество комнат
        "UsrDecisionMaker": "css-selector", // Лицо принимающее решение
        "UsrSquare": "css-selector", // Площадь
        "UsrFinancingSource": "css-selector", // Жилая: Финансирование
        "UsrEquityAmount": "css-selector", // Сумма собственных средств
        "UsrRegion": "css-selector", // Регион
        "UsrQualificationComment": "css-selector", // Комментарий квалификации
        "UsrDisqualificationDate": "css-selector", // Дата дисквалификации
        "UsrDisqualificationComment": "css-selector", // Комментарий дисквалификации
        "UsrAttemptsNumberDistributeResponsible": "css-selector", // Количество попыток распределения ответственного
        "UsrPhoneNumberCode": "#Code", // Код телефона
        "UsrTelephoneNumberForCode": "#Phone", // Номер телефона
        "UsrLeadProperty": "css-selector", // Объект
        "UsrTSId": "css-selector", // TSId
        "UsrTSLeadStatus": "css-selector", // Статус ТС
        "UsrIsCalculate": "css-selector", // Рассчитан
        "UsrManagerNotified": "css-selector", // Руководители были оповещены
        "UsrMinuteBeforeTakingWork": "css-selector", // Минут до принятия в работу
        "UsrCompleteness": "css-selector", // Полнота наполнения, %
        "UsrRentedOutRE": "css-selector", // Жил. недвиж.: Сдан
        "UsrPaymentOption": "css-selector", // Вариант оплаты
        "UsrMaxPriceTo": "css-selector", // Макс. цена до:
        "UsrDeadline": "css-selector", // Срок сдачи
        "UsrSquareFromMall": "css-selector", // Mall: Площадь от:
        "UsrSquareToComMall": "css-selector", // Mall: Площадь до:
        "UsrPriceToCom": "css-selector", // Коммерч.: Цена до:
        "UsrPricePSMToCom": "css-selector", // Коммерч.: Цена за кв.м. до:
        "UsrRateToMall": "css-selector", // Mall: Ставка до:
        "UsrPurposeMall": "css-selector", // Mall: На



тестовая база:
https://office.bir.by:6163/
test1
!QAZ2wsx


Test.txt 

<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js"></script>
<script src="https://files.cloudbpm.ru/Delivery/js/track-cookies.js"></script>
<script src="https://files.cloudbpm.ru/Delivery/js/create-object.js"></script>


<input type="text" id="Name" name="" value="Имя">
<input type="text" id="Code" name="" value="+37533">
<input type="text" id="Phone" name="" value="1234455">
<input type="text" id="Commentary" name="" value="Comments">
 
<button onclick="createObject()">Click Me</button>
<script>
/**
* Замените выражение в кавычках "css-selector" в коде ниже значением селектора элемента на Вашей лендинговой странице.
* Вы можете использовать #id или любой другой CSS селектор, который будет точно определять поле ввода на Вашей лендинговой странице.
* Пример: "Email": "#MyEmailField".
* Если Ваша лендинговая страница не содержит одного или нескольких полей из приведенных ниже – оставьте строку без изменений или удалите полностью.
*/
var config = {
    fields: {
        "Name": "#Name", // Имя посетителя, заполнившего форму
        "Email": "css-selector", // Email посетителя
        "Zip": "css-selector", // Почтовый индекс посетителя
        "MobilePhone": "css-selector", // Телефон посетителя
        "Company": "css-selector", // Название компании
        "Industry": "css-selector", // Отрасль компании
        "FullJobTitle": "css-selector", // Должность посетителя
        "UseEmail": "css-selector", // Логическое значение «да» - согласие посетителя получать email рассылки
        "City": "css-selector", // Город
        "Country": "css-selector", // Страна
        "Commentary": "#Commentary", // Примечание
        "UsrProject": "css-selector", // Проект
        "UsrPropertyType": "css-selector", // Тип недвижимости
        "UsrNumberRooms": "css-selector", // Количество комнат
        "UsrDecisionMaker": "css-selector", // Лицо принимающее решение
        "UsrSquare": "css-selector", // Площадь
        "UsrFinancingSource": "css-selector", // Жилая: Финансирование
        "UsrEquityAmount": "css-selector", // Сумма собственных средств
        "UsrRegion": "css-selector", // Регион
        "UsrQualificationComment": "css-selector", // Комментарий квалификации
        "UsrDisqualificationDate": "css-selector", // Дата дисквалификации
        "UsrDisqualificationComment": "css-selector", // Комментарий дисквалификации
        "UsrAttemptsNumberDistributeResponsible": "css-selector", // Количество попыток распределения ответственного
        "UsrPhoneNumberCode": "#Code", // Код телефона
        "UsrTelephoneNumberForCode": "#Phone", // Номер телефона
        "UsrLeadProperty": "css-selector", // Объект
        "UsrTSId": "css-selector", // TSId
        "UsrTSLeadStatus": "css-selector", // Статус ТС
        "UsrIsCalculate": "css-selector", // Рассчитан
        "UsrManagerNotified": "css-selector", // Руководители были оповещены
        "UsrMinuteBeforeTakingWork": "css-selector", // Минут до принятия в работу
        "UsrCompleteness": "css-selector", // Полнота наполнения, %
        "UsrRentedOutRE": "css-selector", // Жил. недвиж.: Сдан
        "UsrPaymentOption": "css-selector", // Вариант оплаты
        "UsrMaxPriceTo": "css-selector", // Макс. цена до:
        "UsrDeadline": "css-selector", // Срок сдачи
        "UsrSquareFromMall": "css-selector", // Mall: Площадь от:
        "UsrSquareToComMall": "css-selector", // Mall: Площадь до:
        "UsrPriceToCom": "css-selector", // Коммерч.: Цена до:
        "UsrPricePSMToCom": "css-selector", // Коммерч.: Цена за кв.м. до:
        "UsrRateToMall": "css-selector", // Mall: Ставка до:
        "UsrPurposeMall": "css-selector", // Mall: Назначение
        "UsrNumberRoomsRE": "css-selector", // Жил. недвиж.: Количество комнат
        "UsrRentedOutCom": "css-selector", // Коммерч.: Сдан
        "UsrRateToBC": "css-selector", // БЦ: Ставка до:
        "UsrSquareFromBC": "css-selector", // БЦ: Площадь от:
        "UsrPurposeBC": "css-selector", // БЦ: Назначение
        "UsrSquareToComBC": "css-selector", // БЦ: Площадь до:
        "UsrSquareFromCom": "css-selector", // Коммерч: Площадь от:
        "UsrSquareToCom": "css-selector", // Коммерч: Площадь до:
        "UsrMinskMir": "css-selector", // ЖК Минск Мир
        "UsrMayakMinsk": "css-selector", // ЖК Маяк Минска
        "UsrParkCheluslintsev": "css-selector", // ЖК Парк Челюскинцев
        "UsrWrittenConsentEmiratesBlueSky": "css-selector", // Письменное (электронное) согласие Эмиретс Блю Скай
        "UsrRecommender": "css-selector", // Рекомендатель
        "UsrSecondPhoneNumberCode": "css-selector", // Код страны
        "UsrSecondPhoneNumberForCode": "css-selector", // Номер
        "UsrSecondPhoneNumberFull": "css-selector" // Доп. номер телефона
    },
    contactFields: {
        "FullName": "css-selector", // Name of a contact
        "Phone": "css-selector", // Contact's mobile phone
        "Email": "css-selector" // Contact's email
    },
    landingId: "cd8c698b-4b42-4a47-aaf4-7a9e72a0344b",
    serviceUrl: "https://office.bir.by:6163/0/ServiceModel/GeneratedObjectWebFormService.svc/SaveWebFormObjectData",
    redirectUrl: ""
};
/**
* Функция ниже создает Лид из введенных данных.
* Привяжите вызов этой функции к событию "onSubmit" формы или любому другому элементу события.
* Пример: <form class="mainForm" name="landingForm" onSubmit="createObject(); return false">
*/
function createObject() {
    landing.createObjectFromLanding(config)
}

</script>

## Запись аналитики 2025-11-03T08:41:03.439Z (event_id: 1)

- Агент: n/a
- Диалог: n/a
- Источник: ElevenLabs Webhook, статус: n/a
- Тема: n/a
- Намерение: n/a
- Качество ответа агента (1-5): n/a
- Итог: n/a
- Краткий итог: n/a
- Рекомендации: n/a

## Запись аналитики 2025-11-03T08:52:32.381Z (event_id: 2)

- Агент: n/a
- Диалог: n/a
- Источник: ElevenLabs Webhook, статус: n/a
- Тема: n/a
- Намерение: n/a
- Качество ответа агента (1-5): n/a
- Итог: n/a
- Краткий итог: n/a
- Рекомендации: n/a

## Запись аналитики 2025-11-03T08:54:59.269Z (event_id: 3)

- Агент: n/a
- Диалог: n/a
- Источник: ElevenLabs Webhook, статус: n/a
- Тема: недвижимость
- Намерение: покупка квартиры
- Качество ответа агента (1-5): 4
- Итог: оставил контакт
- Краткий итог: Клиент интересуется квартирой для проживания в комплексе «Минск Мир», площадью 55–58 м², готов рассматривать готовые и строящиеся варианты. Агент предложил готовую квартиру ~59 м² за ~118 000 EUR и строящуюся в доме «София» ~60 м² за ~140 000 EUR. Клиент посчитал вариант «София» дорогим, агент предложил дешевле — ~56 м² за ~92 000 EUR в квартале Азия (дом сдан). Клиент отказался от соединения с менеджером, но оставил номер телефона.
- Рекомендации: Передать контакт менеджеру для аккуратного последующего звонка с подборкой более доступных вариантов (этажи/планировки, акции, рассрочки) и отправить предложения в мессенджер/SMS. Уточнить дополнительные критерии (вид, этаж, отделка), чтобы точнее подобрать бюджетные альтернативы.