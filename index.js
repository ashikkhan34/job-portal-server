const express = require('express');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express()
const port = process.env.PORT || 4000;

app.use(express.json())
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(cookieParser())

const logger = (req,res,next) =>{
  console.log('inside the logger')
  next()
}

const verifyToken = (req,res,next) => {
  console.log('inside verify token')
  const token = req.cookies.token;

  if(!token) {
    return res.status(401).send({message: 'Unauthorized access'})
  }

  jwt.verify(token,process.env.JWT_SECRET, (err,decoded) => {
    if(err){
      return res.status(401).send({message:'UnAuthorized Access'})
    }
    req.user = decoded
  next()
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xe3zx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    //job related api 
    const jobCollection = client.db('jobPortal').collection('jobs')
    const jobApplications = client.db('jobPortal').collection('job_applications')



    //auth related api 
    app.post('/jwt', async(req,res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.JWT_SECRET , {expiresIn: '1h'})
      res
      .cookie('token', token,{
        httpOnly:true,
        secure:false
      })
      .send({success:true})
    })

    app.get('/jobs', logger, async(req,res)=>{
      const email = req.query.email;
      let query = {}
      if(email){
        query = {hr_email : email}
      }
      const cursor = jobCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/jobs/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await jobCollection.findOne(query)
      res.send(result)
    })

    //crate .............
    app.post('/jobs', async(req,res) => {
      const newJob = req.body
      const result = await jobCollection.insertOne(newJob)
      res.send(result)
    })

    //job applications apis
    app.post('/job-applications', async(req,res)=>{
      const applications = req.body;
      const result = await jobApplications.insertOne(applications)
      res.send(result)

    })

    app.get('/job-application', verifyToken, async(req,res)=>{
      const email = req.query.email;
      const query = {applicant_email: email}

      if(req.user.email !== req.query.email){
        return res.status(403).send({message:'forbidden access'})
      }

      // console.log('cuk cuk cookie' ,req.cookies)
      const result = await jobApplications.find(query).toArray()

      
      


      // fokira way to aggregate data
      for(const application of result){
        console.log(application.job_id)
        const query1 = {_id: new ObjectId(application.job_id)}
        const job = await jobCollection.findOne(query1)
        if(job){
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
          application.location = job.location
        }
      }
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('job is falling for the sky')
})

app.listen(port, ()=>{
    console.log(`job is waiting at : ${port}`)
})