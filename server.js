const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static("public"));

/* ===== ДАННЫЕ ===== */

let queue = [];
let current = null;

/* ===== ЗАГРУЗКА ===== */

function loadData(){

    if(fs.existsSync("queue.json")){

        const data =
            JSON.parse(
                fs.readFileSync("queue.json")
            );

        queue = data.queue || [];
        current = data.current || null;
    }
}

/* ===== СОХРАНЕНИЕ ===== */

function saveData(){

    fs.writeFileSync(
        "queue.json",
        JSON.stringify(
            {
                queue,
                current
            },
            null,
            2
        )
    );
}

loadData();

/* ===== НОМЕР ===== */

function generateNumber(request){

    let prefix = "A";

    if(request.includes("consult"))
        prefix = "C";

    else if(request.includes("docs"))
        prefix = "D";

    else if(request.includes("pay"))
        prefix = "P";

    else if(request.includes("dorm"))
        prefix = "H";

    else if(request.includes("check"))
        prefix = "V";

    else if(request.includes("other"))
        prefix = "E";

    let count =
        queue.filter(p =>
            p.number.startsWith(prefix)
        ).length + 1;

    return prefix +
        String(count).padStart(4,"0");
}

/* ===== СТОЛ ===== */

function getDesk(request){

    if(request.includes("consult"))
        return 1;

    if(request.includes("docs"))
        return 2;

    if(request.includes("pay"))
        return 3;

    if(request.includes("dorm"))
        return 4;

    if(request.includes("check"))
        return 5;

    return 6;
}

/* ===== АНТИСПАМ ===== */

let lastRequestTime = 0;

/* ================================================= */
/* ================= ДОБАВИТЬ ====================== */
/* ================================================= */

app.post("/queue",(req,res)=>{

    const { name, request } = req.body;

    /* проверка */

    if(!name || name.trim().length < 3){

        return res.json({
            error:"Введите ФИО"
        });
    }

    if(!request){

        return res.json({
            error:"Выберите услугу"
        });
    }

    /* антиспам */

    let now = Date.now();

    if(now - lastRequestTime < 3000){

        return res.json({
            error:"Подождите пару секунд"
        });
    }

    lastRequestTime = now;

    /* очередь */

    const peopleAhead = queue.length;

    const waitTime =
        peopleAhead * 5;

    const person = {

        number:
            generateNumber(request),

        name:
            name.trim(),

        request,

        desk:
            getDesk(request),

        status:
            "ожидает",

        time:
            new Date()
            .toLocaleTimeString()
    };

    queue.push(person);

    saveData();

    res.json({

        number:
            person.number,

        peopleAhead,

        waitTime,

        desk:
            person.desk
    });
});

/* ================================================= */
/* ================= ВСЯ ОЧЕРЕДЬ =================== */
/* ================================================= */

app.get("/queue",(req,res)=>{

    res.json(queue);
});

/* ================================================= */
/* ================= ТЕКУЩИЙ ======================= */
/* ================================================= */

app.get("/current",(req,res)=>{

    res.json(current);
});

/* ================================================= */
/* ================= СЛЕДУЮЩИЙ ===================== */
/* ================================================= */

app.post("/next",(req,res)=>{

    if(queue.length > 0){

        current = queue.shift();

        current.status = "в процессе";

    }else{

        current = null;
    }

    saveData();

    res.json(current);
});

/* ================================================= */
/* ================= ПОВТОР ======================== */
/* ================================================= */

app.post("/recall",(req,res)=>{

    res.json(current);
});

/* ================================================= */
/* ================= ПРОПУСТИТЬ ==================== */
/* ================================================= */

app.post("/skip",(req,res)=>{

    if(queue.length > 0){

        queue.push(
            queue.shift()
        );
    }

    saveData();

    res.json(queue);
});

/* ================================================= */
/* ================= УДАЛИТЬ ======================= */
/* ================================================= */

app.delete("/queue/:number",(req,res)=>{

    const num =
        req.params.number;

    queue =
        queue.filter(
            p => p.number !== num
        );

    saveData();

    res.json(queue);
});

/* ================================================= */
/* ================= РЕДАКТИРОВАТЬ ================= */
/* ================================================= */

app.put("/queue/:number",(req,res)=>{

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

    if(person){

        person.name = name;
        person.request = request;
        person.desk =
            getDesk(request);
    }

    saveData();

    res.json(person);
});

/* ================================================= */
/* ================= СБРОС ========================= */
/* ================================================= */

app.post("/reset",(req,res)=>{

    queue = [];
    current = null;

    saveData();

    res.json({
        ok:true
    });
});

/* ================================================= */
/* ================= СТАТИСТИКА ==================== */
/* ================================================= */

app.get("/stats",(req,res)=>{

    res.json({

        total:
            queue.length,

        current:
            current
                ? current.number
                : null
    });
});

/* ================================================= */
/* ================= ЗАПУСК ======================== */
/* ================================================= */

app.listen(3000,()=>{

    console.log(
        "Сервер запущен на http://localhost:3000"
    );
});