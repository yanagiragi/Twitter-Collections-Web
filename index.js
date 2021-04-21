const express = require('express')
const path = require('path')
const fs = require('fs')
const app = express()

// examples
// node index.js ../Images

const cacheTime = 1000 * 60 * 60 * 24 * 30 // a month

app.use(function (req, res, next) {
	const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
	console.log(`${new Date()} [${req.method}] ${ip} ${req.originalUrl}`)
	next()
})

// outer static
const staticPicDir = path.join(__dirname, process.argv[2])
app.use('/static', express.static(staticPicDir, {
	maxAge: cacheTime
}))

// local static
app.use('/static', express.static('static', {
	maxAge: cacheTime
}))

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, '/index.html'))
})

app.get('/json', function (req, res) {
	const dirs = fs.readdirSync(staticPicDir).filter(x => fs.lstatSync(path.join(staticPicDir, x)).isDirectory() && x.includes("_Container") == false)
	const files = dirs.map(x => {
		const files = fs.readdirSync(path.join(staticPicDir, x))
		return {
			dir: x,
			files: files,
			thumb: files.reduce((acc, ele) => {
				// get largest file
				// const size = fs.statSync(path.join(staticPicDir, x, ele))['size']
				// get latest file
				const size = fs.statSync(path.join(staticPicDir, x, ele))['birthtimeMs']
				if (size > acc.size) {
					return { file: ele, size: size }
				} else {
					return acc
				}
			}, { file: '', size: 0 }).file
		}
	})

	const filteredFiles = files.map(x => {
		const sorted = x.files.sort((y, z) => {
			const birthDateY = fs.statSync(path.join(staticPicDir, x.dir, y))['birthtimeMs']
			const birthDateZ = fs.statSync(path.join(staticPicDir, x.dir, z))['birthtimeMs']
			return birthDateZ - birthDateY
		})

		x.files = sorted.slice(0, 5)
		return x
	})

	res.setHeader('Content-Type', 'application/json')
	res.send(JSON.stringify(filteredFiles, null, 4))
})

app.get('/stat', function (req, res) {
	const dirs = fs.readdirSync(staticPicDir).filter(x => fs.lstatSync(path.join(staticPicDir, x)).isDirectory() && x.includes("_Container") == false)
	const files = dirs.map(x => Object.assign({}, {
		dir: x,
		files: fs.readdirSync( path.join(staticPicDir, x) ).map(el => Object.assign({}, { 
			filename: el,
			birth: fs.statSync( path.join(staticPicDir, x, el) )['birthtimeMs'] 
		}))
	}))

	const filteredFiles = files.map(x => {
		x.files = x.files.sort((y, z) => z.birth - y.birth).slice(0, 5)
		return x.files.map(el => Object.assign({}, { dir: x.dir, filename: el.filename, birth: el.birth }))
	}).flat().sort((x, y) => y.birth - x.birth)

	const result = {}
	for(const data of filteredFiles) {
		result[`${data.dir} - ${data.filename}`] = fs.statSync(path.join(staticPicDir, data.dir, data.filename))['ctime']
	}

	res.setHeader('Content-Type', 'application/json')
	res.send(JSON.stringify(result, null, 4))
})

// C8763
app.listen(8763, function () {
	console.log('Example app listening on port 8763!')
})
