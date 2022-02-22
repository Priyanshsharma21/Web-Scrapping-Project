// node Cricinfo_Extractor.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results  --excel=worldCup.csv  --datafolder=data 

// HTTP request -> When we write "www.google.com" -> We are a client machine (Have client browser) and google has a surver which has port (it listen on that port) -> When we request for the data from client browser server listen it on its respective post and send response
// 1. When we request for the data -> An request object created -> This object send to DNS from where we get ip adress
// (Browser made request object from url according to http protocol)
// 2. Server see the req and send the res in form of html css js (Server send respomc\se according to http protocol)
// 3. Now we dont have browser on out programe so we used axios

// First we require all the librarys we need 

let minimist = require('minimist'); //to get data from console
let jsdom = require('jsdom'); // to convert html in dom
let fs = require('fs'); // to read write file
let xl = require('excel4node'); // to r-w excel
let axios = require('axios'); // to downlode html from web
let path = require('path'); // to get path of file
let pdf = require('pdf-lib'); // to r-w pdf file
const {
    engine
} = require('express/lib/application');


let args = minimist(process.argv);

console.log(args.source);
console.log(args.excel);
console.log(args.datafolder);



// downlode using axios 

let downlode_pr = axios.get(args.source); // this gives promise to downlode our data (url se banaya req obj ->server ne html in http form res bhaja)

downlode_pr.then(function (res) { // once data dowmloded we get it inside res


    // if (res.statusCode != 200) { // if status code is not 200 it will return back
    //     return;
    // }








    let html = res.data; // we get our data in html

    let dom = new jsdom.JSDOM(html); // we give that data to jsdom to create dom for us
    let document = dom.window.document; // extract document from it // with the help of document we can manupulate html


    let matches = []; // creating all matches array
    let match_info = document.querySelectorAll("div.match-score-block"); // match info div


    for (let i = 0; i < match_info.length; i++) { // loop in match info div

        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""

        };

        // here we extract team1, team2, team1score, team2score , result and place it in object match

        let teamNameP = match_info[i].querySelectorAll("p.name");

        match.t1 = teamNameP[0].textContent;
        match.t2 = teamNameP[1].textContent;

        let teamScoreS = match_info[i].querySelectorAll("div.score-detail span.score");
        if (teamScoreS.length == 2) { // match can be abondent or dl so for that resone
            match.t1s = teamScoreS[0].textContent;
            match.t2s = teamScoreS[1].textContent;
        } else if (teamScoreS.length == 1) {
            match.t1s = teamScoreS[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        } // indoa vs nz cancel due to rain 



        let resultD = match_info[i].querySelector("div.status-text span");
        match.result = resultD.textContent;

        matches.push(match); //!Now our JSO is ready // Here we get all matches information
    }

    //! But we want teams infromation //
    //! I This array we identify the number of teams 

    let matchesJson = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJson, "utf-8");

    // given this json 

    //* [{
    //*     "t1": "New Zealand",
    //*     "t2": "England",
    //*     "t1s": "241/8",
    //*     "t2s": "241",
    //*     "result": "Match tied"
    //*   },
    // *  {
    // *    "t1": "Australia",
    //*     "t2": "England",
    // *    "t1s": "223",
    // *    "t2s": "226/2",
    // *    "result": "England won by 8 wickets (with 107 balls remaining)"
    // *  },
    // *]


    //* {nz,matches[]}
    //* {eng,matches[]}
    //* {australia,matches[]}
    //* {india,matches[]}
    //* {sa,matches[]}
    //* {sri,matches[]}
    //* {pak,matches[]}
    //* {ban,matches[]}
    //* {wi,matches[]}
    //* {afgan,matches[]} we want this json

















    let teams = []; // [{"India" matches[]}]  // creating a teams array to get all teams information

    for (let i = 0; i < matches.length; i++) {
        // this loop will run in all the matches and see if the team is present skip of nor put it in teams array

        populateTeams(teams, matches[i]); // (teams,matches[i].t1) ,  (teams,matches[i].t2)
        //! Put teams in teams array if missing
        //! This function traverse in whole matches[0,1,2,3,4,5] and in eveey match it chack teams
        //! Match[0] -> India -> if teams is present-> skip -> otherwise it put it in teams[] array 
    }

    for (let i = 0; i < matches.length; i++) {
        putMatchInApropiateTeam(teams, matches[i].t1, matches[i].t2, matches[i].t1s, matches[i].t2s, matches[i].result);
        putMatchInApropiateTeam(teams, matches[i].t2, matches[i].t1, matches[i].t2s, matches[i].t1s, matches[i].result);
        //TODO:- This loop will put appropiate team in matches array //
        //TODO:  putMatcxhInApppTeam(teams.matches[i].t1, mathes[i].t2, match[i].t1s, .t2s, .result)
        //TODO:  putMatcxhInApppTeam(teams.matches[i].t2, mathes[i].t1, match[i].t2s, .t1s, .result)
    }

    let teamsJson = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJson, "utf-8");;

    createExcelFile(teams);

    createPDF(teams, args.datafolder);


}).catch(function (err) {
    console.log(err);
})


function populateTeams(teams, match) { //! teams[] , match[0] (teams[], teamName)
    // let t1idx = teams.findIndex(function(team){
    //     if(team.name == match.t1){
    //         return true;
    //     }else{
    //         return false;
    //     }
    // })

    // Now this function runs and help put teams in teams array

    //! or 

    let t1idx = -1;
    //  this array check if the team present in the teams array if not so put it otherwise skip
    for (let i = 0; i < teams.length; i++) { //! at first teams[] is empty so for not execute
        if (teams[i].name == match.t1) { //? Kya teams array mai match.t1 hai
            t1idx = i; //! If we get team in the index check in next index
            break;
        }
    }

    if (t1idx == -1) { //! tidx is -1 (yes), then create object and push it in teams[]
        let team = { // when a team not present in the array teams then it will create an object team and put it in the teams
            name: match.t1,
            matches: []
        };

        teams.push(team);

    }


    let t2idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    if (t2idx == -1) {
        let team = {
            name: match.t2,
            matches: []
        };

        teams.push(team);

    }

}
//TODO till now teams are 
//! teams[
//* {nz,matches[]}
//* {eng,matches[]}
//* {australia,matches[]}
//* {india,matches[]}
//* {sa,matches[]}
//* {sri,matches[]}
//* {pak,matches[]}
//* {ban,matches[]}
//* {wi,matches[]}
//* {afgan,matches[]}

]

function putMatchInApropiateTeam(teams, homwTeam, oppTeam, OurScore, oppScore, result) { //TODO: This function will put dat in opposit teams

    // for example new vs eng 

    let t1idx = -1;

    for (let i = 0; i < teams.length; i++) { //! Here teams array is full, Now chack
        if (teams[i].name == homwTeam) {
            t1idx = i;
            break;
        }
    }

    let team1 = teams[t1idx]; // in newze section england match writen in england newze written
    team1.matches.push({ // teams array ke andar name and matches array hai usmr pudh ksro
        vs: oppTeam, // t1 ke samne t2
        selfScore: OurScore,
        opponentScore: oppScore,
        result: result

    })
}
// make excel using excel4node




function createExcelFile(teams) {
    let wb = new xl.Workbook();

    let mStyle = wb.createStyle({
        font: {
            color: 'light green',
            size: 12,
        },
        alignment: {
            wrapText: true,
            horizontal: 'center',
        },
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: "indigo",

        },
    });

    let cStyle = wb.createStyle({
        font: {
            color: 'green',
            size: 12,
        },
        alignment: {
            wrapText: true,
            horizontal: 'center',
        },
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: "light green",

        },
    });

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);


        sheet.cell(1, 1).string("V/S").style(mStyle);
        sheet.cell(1, 2).string("Self Score").style(mStyle);
        sheet.cell(1, 3).string("Opponent Score").style(mStyle);
        sheet.cell(1, 4).string("Result").style(mStyle);

        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(3 + j, 1).string(teams[i].matches[j].vs).style(cStyle);
            sheet.cell(3 + j, 2).string(teams[i].matches[j].selfScore).style(cStyle);
            sheet.cell(3 + j, 3).string(teams[i].matches[j].opponentScore).style(cStyle);
            sheet.cell(3 + j, 4).string(teams[i].matches[j].result).style(cStyle);
        }
    }

    wb.write(args.excel);
}



// make pdf using pdf-lib

function createPDF(teams, datafolder) {

    if (fs.existsSync(datafolder) == true) {
        fs.rmdirSync(dir,{recursive:true}); // if already exist folder then delete it
    } // If the folder present skip otherwise crrate
    fs.mkdirSync(datafolder);

    for (let i = 0; i < teams.length; i++) {
        let TfoName = path.join(datafolder, teams[i].name);
        if (fs.existsSync(TfoName) == false) {
            fs.mkdirSync(TfoName);
        } // If the file absent then create otherswise skip

        for (let j = 0; j < teams[i].matches.length; j++) {
            let fileName = path.join(TfoName, teams[i].matches[j].vs);
            createMatchScoreCardPDF( teams[i].matches[j],fileName,teams[i].name);
        }

    }
}

function createMatchScoreCardPDF( match,fileName,teamName) {

    // let team1 = teams.name;
    // let team2 = match.vs;
    // let team1score = match.t1s;
    // let team2score = match.t2s;
    // let result = match.result;

    let orignalBytes = fs.readFileSync("TempCric.pdf");

    let pr2lodeOG = pdf.PDFDocument.load(orignalBytes);
    pr2lodeOG.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);
        page.drawText(teamName ,{
            x: 379,
            y: 598,
            size: 30,
        });
        page.drawText(match.vs ,{
            x: 345,
            y: 535,
            size: 30,
        });
        page.drawText(match.selfScore ,{
            x: 379,
            y: 480,
            size: 30,
        });
        page.drawText(match.opponentScore ,{
            x: 379,
            y: 420,
            size: 30,
        });
        page.drawText(match.result ,{
            x: 290,
            y: 369,
            size: 10,
        })

        let pr2Save = pdfdoc.save();
        pr2Save.then(function(newBytes){
            if(fs.existsSync(fileName + ".pdf") ==true){
                fs.writeFileSync(fileName + "1.pdf",newBytes);
            }

        })

    })

}