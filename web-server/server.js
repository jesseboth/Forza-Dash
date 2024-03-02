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

            // for future changes, -o shortens packet - values in optimized.go
            telemetry = spawn('../telemetry/fdt', ['-game', req.url.substring(1), '-j', '-o'], options);
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

            // for future changes, -o shortens packet - values in optimized.go
            telemetry = spawn('../telemetry/fdt', ['-game', req.url.substring(1), '-j', '-o'], options);
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
                    retJson = getCarData(carNumber)
                }
                // else {
                //     updateCarData(carNumber, meters);
                    
                // }
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
function updateCarData(carNumber, meters, offset=0) {
    const filename = 'odometers.json';

    // Read existing data from JSON file
    let carData = {};
    try {
        const data = fs.readFileSync(filename, 'utf8');
        carData = JSON.parse(data);
    } catch (error) {
        // Handle file read error or empty file
    }

    if(meters > 0 && carNumber > 0){
        newMeters = carData[carNumber] + (meters - offset);
        carData[carNumber] = newMeters;
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
    offset: 0
}

function getCarData(carNumber) {
    let carData = {};
    try {
        // Read data from JSON file
        const data = fs.readFileSync('odometers.json', 'utf8');
        carData = JSON.parse(data);
    } catch (err) {
        return null;
    }

    carString = carNumber.toString();
    offset = 0;
    if(OdometerInfo.carNumber == carNumber){
        offset = OdometerInfo.offset;
    }
    // Check if the car number exists in the data
    if (carData.hasOwnProperty(carNumber)) {
        // Dynamically set the key of the return object
        return { "carNumber": carString, "meters": (carData[carNumber]-offset) };
    } else {
        // Dynamically set the key of the return object
        return { "carNumber": carString, "meters": 0 };
    }
}

dataSaved = false;
let interval = setInterval(updateOdometer, 1000); 
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
        jsonData = JSON.parse(data);
        newCarNumber = jsonData[0]["CarOrdinal"]
        newMeters = jsonData[2]["DistanceTraveled"]

        // when in menus
        if(!dataSaved && newCarNumber == 0 && OdometerInfo.carNumber != 0){
            dataSaved = true;
            updateCarData(OdometerInfo.carNumber, OdometerInfo.meters, OdometerInfo.offset)
            OdometerInfo.offset = OdometerInfo.meters;
            return;
        }

        // Starting new race
        else if(newCarNumber == OdometerInfo.carNumber && newMeters != OdometerInfo.meters &&  newMeters == 0){
            updateCarData(OdometerInfo.carNumber, OdometerInfo.meters, OdometerInfo.offset)
            offset = 0;

        }
        // New car
        else if(newCarNumber != 0 && OdometerInfo.carNumber != newCarNumber){
            updateCarData(3, OdometerInfo.carNumber, OdometerInfo.meters, OdometerInfo.offset)
            offset = 0;
        }
        if(newCarNumber != 0){
            dataSaved = false;
        }
        if(newCarNumber != 0){
            OdometerInfo.carNumber = newCarNumber;
            OdometerInfo.meters = newMeters;
        }


        // Optionally return data if needed
        });
    });
    
    req.on('error', (error) => {
    });
    
    req.end();
}
