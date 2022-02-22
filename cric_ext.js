//  node cric_ext.js  --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results  --excel=worldCup.csv  --datafolder=data


let minimist = require('minimist');
let jsdom = require('jsdom');
let fs = require('fs');
let xl = require('excel4node');
let axios = require('axios');
let path = require('path');
let pdf = require('pdf-lib');
const { dir } = require('console');
const { dirname } = require('path');


let args = minimist(process.argv);

console.log(args.source);
console.log(args.excel);
console.log(args.datafolder);



// downlode using axios 

let downlode_pr = axios.get(args.source);


downlode_pr.then(function (res) {

    let html = res.data;

    // using jsdom for data extraction 

    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;


    let matches = [];
    let match_info = document.querySelectorAll("div.match-score-block");


    for (let i = 0; i < match_info.length; i++) {

        let match = {

        };

        let teamNameP = match_info[i].querySelectorAll("p.name");

        match.t1 = teamNameP[0].textContent;
        match.t2 = teamNameP[1].textContent;

        let teamScoreS = match_info[i].querySelectorAll("div.score-detail span.score");
        if (teamScoreS.length == 2) {
            match.t1s = teamScoreS[0].textContent;
            match.t2s = teamScoreS[1].textContent;
        } else if (teamScoreS.length == 1) {
            match.t1s = teamScoreS[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let resultD = match_info[i].querySelector("div.status-text span");
        match.result = resultD.textContent;

        matches.push(match);
    }

    let matchesJson = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJson, "utf-8");



    let teams = [];

    for (let i = 0; i < matches.length; i++) {
        putTeamInTeamsIfMissing(teams, matches[i]);

    }

    for (let i = 0; i < matches.length; i++) {
        putMatchInApropiateTeam(teams, matches[i]);
    }



    let teamsJson = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJson, "utf-8");

    createExcelFile(teams);
    createPDF(teams, args.datafolder);



}).catch(function (err) {
    console.log(err);
})


function putTeamInTeamsIfMissing(teams, match) {

    let t1idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    if (t1idx == -1) {
        let team = {
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







function putMatchInApropiateTeam(teams, match) {
    let t1idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        opponentScore: match.t2s,
        result: match.result

    })


    let t2idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        opponentScore: match.t1s,
        result: match.result

    })
}


// excel file excel4node 

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



// pdf-lib 

function createPDF(teams, datafolder) {

    if (fs.existsSync(datafolder) == true) {
        fs.rm(datafolder,{recursive:true}); 
    } 

    fs.mkdirSync(datafolder);

    for (let i = 0; i < teams.length; i++) {
        let TfoName = path.join(datafolder, teams[i].name);
            fs.mkdirSync(TfoName);
         

        for (let j = 0; j < teams[i].matches.length; j++) {
            let match = teams[i].matches[j];
            createMatchScoreCardPDF(TfoName,teams[i].name, match);
        }

    }
}

function createMatchScoreCardPDF(TfoName,homeTeam,match) {

    let matchfileName = path.join(TfoName, match.vs);

    let orignalBytes = fs.readFileSync("TempCric.pdf");

    let pr2lodeOG = pdf.PDFDocument.load(orignalBytes);
    pr2lodeOG.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);
        page.drawText(homeTeam ,{
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
            if(fs.existsSync(matchfileName + ".pdf") ==true){
                fs.writeFileSync(matchfileName + "1.pdf",newBytes);
            }else{
                fs.writeFileSync(matchfileName + ".pdf",newBytes);
            }

        })

    })

}












// node cric_ext.js  --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results  --excel=worldCup.csv  --datafolder=data
