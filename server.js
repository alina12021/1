const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static("public"));


// =====================================
// ДАННЫЕ
// =====================================

let queue = [];

let current = null;

let stats = {

    total: 0,

    served: 0,

    desks: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
    }
};


// =====================================
// ЗАГРУЗКА
// =====================================

function loadData() {

    if (fs.existsSync("queue.json")) {

        const data =
            JSON.parse(
                fs.readFileSync("queue.json")
            );

        queue = data.queue || [];

        current = data.current || null;

        stats = data.stats || stats;
    }
}


// =====================================
// СОХРАНЕНИЕ
// =====================================

function saveData() {

    fs.writeFileSync(

        "queue.json",

        JSON.stringify({

            queue,

            current,

            stats

        })
    );
}

loadData();


// =====================================
// ГЕНЕРАЦИЯ НОМЕРА
// =====================================

function generateNumber(request) {

    let prefix = "A";

    if (request.includes("consult"))
        prefix = "C";

    if (request.includes("docs"))
        prefix = "D";

    if (request.includes("pay"))
        prefix = "P";

    if (request.includes("other"))
        prefix = "E";

    if (request.includes("dorm"))
        prefix = "H";

    let count =

        queue.filter(p =>
            p.number.startsWith(prefix)
        ).length + 1;

    return (

        prefix +

        String(count)
            .padStart(4, "0")
    );
}


// =====================================
// СТОЛ
// =====================================

function getDesk(request) {

    if (request.includes("consult"))
        return 1;

    if (request.includes("docs"))
        return 2;

    if (request.includes("pay"))
        return 3;

    if (request.includes("other"))
        return 4;

    if (request.includes("dorm"))
        return 5;

    return 1;
}


// =====================================
// АНТИСПАМ
// =====================================

let lastRequestTime = 0;


// =====================================
// ДОБАВИТЬ В ОЧЕРЕДЬ
// =====================================

app.post("/queue", (req, res) => {

    const {
        name,
        request
    } = req.body;

    // проверка имени
    if (!name || name.trim().length < 3) {

        return res.json({
            error: "Введите ФИО"
        });
    }

    // проверка услуги
    if (!request) {

        return res.json({
            error: "Выберите услугу"
        });
    }

    // антиспам
    let now = Date.now();

    if (now - lastRequestTime < 3000) {

        return res.json({
            error:
                "Подождите несколько секунд"
        });
    }

    lastRequestTime = now;

    // очередь
    const peopleAhead = queue.length;

    // ожидание
    const waitTime =
        peopleAhead * 5;

    // человек
    const person = {

        number:
            generateNumber(request),

        name,

        request,

        desk:
            getDesk(request),

        status: "ожидает",

        time:
            new Date()
                .toLocaleTimeString()
    };

    // добавить
    queue.push(person);

    // статистика
    stats.total++;

    stats.desks[person.desk]++;

    // сохранить
    saveData();

    // ответ
    res.json({

        number:
            person.number,

        peopleAhead,

        waitTime,

        desk:
            person.desk
    });
});


// =====================================
// ВСЯ ОЧЕРЕДЬ
// =====================================

app.get("/queue", (req, res) => {

    res.json(queue);
});


// =====================================
// ТЕКУЩИЙ
// =====================================

app.get("/current", (req, res) => {

    res.json(current);
});


// =====================================
// СЛЕДУЮЩИЙ
// =====================================

app.post("/next", (req, res) => {

    if (queue.length > 0) {

        current = queue.shift();

        current.status =
            "в процессе";

        // статистика
        stats.served++;

    } else {

        current = null;
    }

    saveData();

    res.json(current);
});


// =====================================
// ПОВТОР
// =====================================

app.post("/recall", (req, res) => {

    res.json(current);
});


// =====================================
// ПРОПУСК
// =====================================

app.post("/skip", (req, res) => {

    if (queue.length > 0) {

        queue.push(
            queue.shift()
        );
    }

    saveData();

    res.json(queue);
});


// =====================================
// УДАЛИТЬ
// =====================================

app.delete("/queue/:number",

(req, res) => {

    const num =
        req.params.number;

    queue =
        queue.filter(
            p => p.number !== num
        );

    saveData();

    res.json(queue);
});


// =====================================
// РЕДАКТИРОВАТЬ
// =====================================

app.put("/queue/:number",

(req, res) => {

    const num =
        req.params.number;

    const {
        name,
        request
    } = req.body;

    let person =
        queue.find(
            p => p.number === num
        );

    if (person) {

        person.name = name;

        person.request = request;

        person.desk =
            getDesk(request);
    }

    saveData();

    res.json(person);
});


// =====================================
// ОЧИСТКА
// =====================================

app.post("/reset", (req, res) => {

    queue = [];

    current = null;

    stats = {

        total: 0,

        served: 0,

        desks: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        }
    };

    saveData();

    res.json({
        ok: true
    });
});


// =====================================
// СТАТИСТИКА
// =====================================

app.get("/stats", (req, res) => {

    res.json(stats);
});


// =====================================
// ЗАПУСК
// =====================================

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        "Сервер запущен"
    );
});