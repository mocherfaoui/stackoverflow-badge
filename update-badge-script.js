import fetch from 'node-fetch';
import fs from 'fs';

let userID = 18457414
let userName = "mocherfaoui"

let templateFile = 'badge-template.svg'
let outputFile = 'stackoverflow-badge.svg'
let apiURL = "https://api.stackexchange.com/2.3/"
let getUserURL = apiURL + "users/" + userID + "?order=desc&sort=reputation&site=stackoverflow"

fetch(getUserURL, {
    method: 'get',
    headers: {'Content-Type': 'application/json'}
})
    .then((res) => res.json())
    .then((json) => {
        updateBadge(json.items[0])
    });

function updateBadge(json) {
    try {
        let badgeData = parseJson(json);
        let templateData = readFile(templateFile);
        let compiledBadge = compileTemplate(templateData, badgeData);
        let oldBadge = readFile(outputFile);

        if (userName !== badgeData.username) {
            console.error("Reviewed wrong username from API: " + badgeData.username);
            setUpdateBannerEnv("false")
        } else if (oldBadge === compiledBadge) {
            console.log("Badge data has not changed. Skipping commit.");
            setUpdateBannerEnv("false")
        } else {
            console.log("Updating badge ...");
            fs.writeFileSync("./" + outputFile, compiledBadge);
            console.log("Updated " + outputFile + " successfully");
            setUpdateBannerEnv("true")
        }
    } catch (error) {
        console.error(error);
    }
}

function setUpdateBannerEnv(value) {
    setEnv("update-badge", value)
}

function setEnv(key, value) {
    fs.writeFileSync(process.env.GITHUB_ENV, key + "=" + value);
}

function parseJson(json) {
    let reputation = json.reputation;
    let bronze = json.badge_counts.bronze;
    let silver = json.badge_counts.silver;
    let gold = json.badge_counts.gold;
    let userName = json.display_name;
    let profileImage = json.profile_image;
    console.log("Received from stackoverflow API:" + reputation + "," + bronze + "," + silver + "," + gold);
    return new BadgeData(userName, reputation, bronze, silver, gold, profileImage)
}

class BadgeData {
    constructor(username, reputation, bronze, silver, gold, profileImage) {
        this.username = username;
        this.reputation = reputation;
        this.bronze = bronze;
        this.silver = silver;
        this.gold = gold;
        this.profileImage = profileImage;
    }
}

function readFile(file) {
    return fs.readFileSync("./" + file, 'utf8')
}

async function compileTemplate(template, badgeData) {
    // Fetch the image and convert it to base64
    const imageResponse = await fetch(badgeData.profileImage);
    const imageBlob = await imageResponse.blob();
    const base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageBlob);
    });

    return template
        .replaceAll("${reputation}", badgeData.reputation)
        .replaceAll("${bronze}", badgeData.bronze)
        .replaceAll("${silver}", badgeData.silver)
        .replaceAll("${gold}", badgeData.gold)
        .replaceAll("${profile_image}", base64Image);
}
