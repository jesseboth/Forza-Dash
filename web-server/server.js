const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { spawn } = require('child_process');
const port = 3000; // This is the port for the Express server

telemetry = null;
telemetryType = ""
const options = {
    cwd: '../telemetry/', // Set the working directory
};

let newSplit = Date.now();

dash="/forza-dash";

const EventEmitter = require('events');
class Emitter extends EventEmitter { };
const myEmitter = new Emitter();
const serveFile = async (filePath, contentType, response) => {
  try {
      const rawData = await fsPromises.readFile(
          filePath,
          !contentType.includes('image') ? 'utf8' : ''
      );
      const data = contentType === 'application/json'
          ? JSON.parse(rawData) : rawData;
      response.writeHead(
          filePath.includes('404.html') ? 404 : 200,
          { 'Content-Type': contentType }
      );
      response.end(
          contentType === 'application/json' ? JSON.stringify(data) : data
      );
  } catch (err) {
      console.log(err);
      myEmitter.emit('log', `${err.name}: ${err.message}`, 'errLog.txt');
      response.statusCode = 500;
      response.end();
  }
}

const server = http.createServer((req, res) => {
  // console.log(req.url, req.method);
  myEmitter.emit('log', `${req.url}\t${req.method}`, 'reqLog.txt');

  const extension = path.extname(req.url);

  let contentType;

  if(req.url == "/telemetrytype" && req.method === 'GET'){
    retVal = {"type": null}
    if(telemetry != null){
        retVal["type"] = telemetryType;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(retVal));
    return;
  }
  else if (req.url.startsWith("/FM") && req.method === 'POST') {
        retVal = {succss: false}
        if(telemetry == null){
            telemetryType = "motorsport"
            dash = "forza-dash"
            telemetry = spawn('../telemetry/fdt', ['-game', req.url.substring(1), '-j'], options);
            retVal.success = true;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(retVal));
        return;
    }
    else if (req.url.startsWith("/FH") && req.method === 'POST') {
        retVal = {succss: false}
        if(telemetry == null){
            telemetryType = "horizon"
            dash = "forza-dash"
            telemetry = spawn('../telemetry/fdt', ['-game', req.url.substring(1), '-j'], options);
            retVal.success = true;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(retVal));
        return;
    }
    else if (req.url === '/stop' && req.method === 'POST') {
        if(telemetry != null){
            telemetryType = "";
            telemetry.kill('SIGKILL');
            telemetry = null
            resetOdometer()
            dash = "forza-dash"
        }

        retVal = {success: true}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(retVal));
        return;
    }
    else if (req.url == "/Odometer" && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString(); // convert Buffer to string
        });

        req.on('end', () => {
            try {
                retJson = {}
                const data = JSON.parse(body);
                const carNumber = data.carNumber;
                const meters = data.meters;

                if(meters == null){
                    retJson = readOdometer(carNumber)
                }
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(JSON.stringify(retJson));

            } catch (error) {
                console.error('Error parsing JSON:', error);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid JSON');
            }
        });
        return;
    }
    else if (req.url == "/Split" && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString(); // convert Buffer to string
        });

        req.on('end', () => {
            try {
                retJson = {
                    splits: null,
                }

                const data = JSON.parse(body);
                if(data.type == "get"){
                    splits = getCarSplits(data.carID, data.trackID)
                    retJson.splits = splits;
                }
                else if(data.type == "set"){
                    if(Date.now() - newSplit > 10000){
                        newSplit = Date.now();
                        setCarSplits(data.carID, data.trackID, data.splits)
                    }
                }

                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(JSON.stringify(retJson));

            } catch (error) {
                console.error('Error parsing JSON:', error);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid JSON');
            }
        });
        return;
    }

  switch (extension) {
      case '.css':
          contentType = 'text/css';
          break;
      case '.js':
          contentType = 'text/javascript';
          break;
      case '.json':
          contentType = 'application/json';
          break;
      case '.jpg':
          contentType = 'image/jpeg';
          break;
      case '.png':
          contentType = 'image/png';
          break;
      case '.txt':
          contentType = 'text/plain';
          break;
      case '.otf':
          contentType = 'application/x-font-opentype';
          break;
      default:
          contentType = 'text/html';
  }

  let filePath =
      contentType === 'text/html' && req.url === '/'
          ? path.join(__dirname, 'views', 'index.html')
          : contentType === 'text/html' && req.url.slice(-1) === '/'
              ? path.join(__dirname, 'views', req.url, 'index.html')
              : contentType === 'text/html'
                  ? path.join(__dirname, 'views', req.url)
                  : path.join(__dirname, req.url);

  // makes .html extension not required in the browser
  if (!extension && req.url.slice(-1) !== '/') filePath += '.html';

  const fileExists = fs.existsSync(filePath);

  if(req.url == "/dash"){
    serveFile(path.join(__dirname, 'views', dash+'.html'), 'text/html', res);
    return;
  }

  if (fileExists) {
      serveFile(filePath, contentType, res);
  } else {
      switch (path.parse(filePath).base) {
          case 'old-page.html':
              res.writeHead(301, { 'Location': '/new-page.html' });
              res.end();
              break;
          case 'www-page.html':
              res.writeHead(301, { 'Location': '/' });
              res.end();
              break;
          default:
              serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', res);
      }
  }
});
const PORT = process.env.PORT || port;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// Function to update car data in a JSON file
function updateCarData() {
    const filename = 'data/odometers.json';

    // Read existing data from JSON file
    let carData = {};
    try {
        const data = fs.readFileSync(filename, 'utf8');
        carData = JSON.parse(data);
    } catch (error) {
        // Handle file read error or empty file
    }

    if(OdometerInfo.carNumber > 0 && !carData.hasOwnProperty(OdometerInfo.carNumber)){
        carData[OdometerInfo.carNumber] = OdometerInfo.stored;
    }
    else if(OdometerInfo.carNumber > 0 && OdometerInfo.stored > carData[OdometerInfo.carNumber]){
        carData[OdometerInfo.carNumber] = OdometerInfo.stored;
    }
    else {
        return;
    }
    // Write updated data back to JSON file
    try {
        const jsonData = JSON.stringify(carData, null, 2);
        fs.writeFileSync(filename, jsonData);
    } catch (error) {
    }
}

OdometerInfo = {
    carNumber: 0,
    meters: 0,
    offset: 0,
    stored: 0,
}

function getCarData(carNumber){
    try {
        const data = fs.readFileSync('data/odometers.json', 'utf8');
        carData = JSON.parse(data);
    } catch (err) {
        return;
    }

    carString = carNumber.toString();
    // Check if the car number exists in the data
    if (carData.hasOwnProperty(carNumber)) {
        OdometerInfo.stored = (carData[carNumber])
    } else {
        OdometerInfo.stored = 0;
    }
}

function getStoredDistance(carNumber){
    try {
        const data = fs.readFileSync('data/odometers.json', 'utf8');
        carData = JSON.parse(data);
    } catch (err) {
        console.log(err)
        return;
    }

    carString = carNumber.toString();

    // Check if the car number exists in the data
    if (carData.hasOwnProperty(carNumber)) {
        return carData[carNumber];
    } else {
        return 0;
    }
}

dataSaved = false;
let interval = setInterval(updateOdometer, 25); 
function updateOdometer(){
    if (telemetryType == "") {
        return;
    }
    
    const options = {
        hostname: "localhost",
        port: 8888,
        path: '/telemetry',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        
        // A chunk of data has been received
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        // The whole response has been received
        res.on('end', () => {
            if (res.statusCode !== 200) {
                return;
            }
            if(data == null){
                return;
            }
            try {
                jsonData = JSON.parse(data);
            }
            catch{
                return;
            }

            newCarNumber = jsonData["CarOrdinal"]
            newMeters = jsonData["DistanceTraveled"];
            velocity = jsonData["Speed"];
            if(newMeters == 0 && velocity > 5){
                newMeters = OdometerInfo.meters+(velocity*.025)
            }

            if(newCarNumber != OdometerInfo.carNumber){
                updateCarData()
                getCarData(newCarNumber);
            }

            if(newCarNumber != 0){
                dataSaved = false;
            }

            OdometerInfo.carNumber = newCarNumber;
            if(newCarNumber != 0){
                if(newMeters <= 0){
                    OdometerInfo.offset = newMeters
                }
                else{
                    OdometerInfo.offset = OdometerInfo.meters;
                }
                OdometerInfo.meters = newMeters;
                OdometerInfo.stored += (OdometerInfo.meters-OdometerInfo.offset)
            }

        });
    });
    
    req.on('error', (error) => {
    });
    
    req.end();
}

function readOdometer(carNumber) {
    carString = carNumber.toString();
    if (OdometerInfo.carNumber == carNumber) {
        return { "carNumber": carString, "meters": OdometerInfo.stored };
    } else {
        return { "carNumber": carString, "meters": getStoredDistance(carNumber) };
    }
}

function resetOdometer(){
    updateCarData()

    OdometerInfo.carNumber = 0;
    OdometerInfo.meters = 0;
    OdometerInfo.offset = 0;
    OdometerInfo.store = 0;
}

function getCarSplits(carNumber, trackID){
    try {
        const file = fs.readFileSync('data/splits.json', 'utf8');
        data = JSON.parse(file)[carNumber+":"+trackID];
    } catch (err) {
        console.error(err)
        data = null;
    }
    return data;
}

function setCarSplits(carNumber, trackID, times){
    try {
        // Read and parse the existing data
        let fileData = fs.readFileSync('data/splits.json', 'utf8');
        const jsonData = JSON.parse(fileData);

        jsonData[`${carNumber}:${trackID}`] = times;

        // Custom formatting: Write each key-value pair, ensuring arrays are single-line
        let formattedOutput = '{\n' + 
        Object.entries(jsonData).map(([key, value]) => {
        // Format array values on one line
        const arrayString = Array.isArray(value) ? `[${value.join(', ')}]` : JSON.stringify(value);
        return `  "${key}": ${arrayString}`;
        }).join(',\n') + '\n}';

        // Write the updated data back to the file
        fs.writeFileSync('data/splits.json', formattedOutput);
    } catch (err) {
        console.error("Error writing splits:", err);
    }
}