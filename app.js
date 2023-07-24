const express=require("express");
const path=require("path");
const {open}=require("sqlite");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const sqlite3=require("sqlite3")
const dbpath=path.join(__dirname,"covid19IndiaPortal.db");
const app=express();
app.use(express.json());
let db=null;

const InitializeDB=async()=>{
    try {db=await open({
        filename:dbpath,
        driver:sqlite3.Database
    })
    app.listen(3000,()=>{
        console.log("SERVER RUNNING at http://localhost:3000/")
    });
    }
    catch(e){
        console.log(`DB error ${e.message}`)
    }
}

InitializeDB();

const authenticateToken=(request,response,next)=>{
        let jwtToken;
        const authHeader=request.headers["authorization"];
        console.log(authHeader);
        if(authHeader===undefined){
            response.status(401);
            response.send("Invalid JWT Token");
        }
        else{
            jwtToken =authHeader.split(" ")[1];

            jwt.verify(jwtToken,"TOKEN",async(error,payload)=>{
                if(error){
                    response.status(401);
                    response.send("Invalid JWT Token")
                }
                else{
                    next();
                }
            })
        }

}

//API 1
app.post("/login/",async(request,response)=>{
    const {username,password}=request.body;
    const userQuery=`select * from user where username="${username}"`
    const dbuser=await db.get(userQuery);

    if(dbuser===undefined){
        response.status(400)
        response.send("Invalid user")
    }
    else{
        const isPasswordMatched=await bcrypt.compare(password,dbuser.password)
        if(isPasswordMatched===true){
            const payload={username:username};
          const jwtToken=jwt.sign(payload,"TOKEN");
          response.send({jwtToken});
        }else{
            response.status(400)
            response.send("Invalid password")
        }
    }
})


//API 2
app.get("/states/",authenticateToken,async(request,response)=>{
 const Query=`select * from state`

 const result=await db.all(Query);
 response.send(result.map((i)=>({stateId:i.state_id,
                stateName:i.state_name,
                population:i.population})));

});


//API 3
app.get("/states/:stateId/",authenticateToken,async(request,response)=>{
const {stateId}=request.params;
 const Query=`select * from state
            where state_id=${stateId}`
 const result=await db.get(Query);
 response.send({stateId:result.state_id,
                stateName:result.state_name,
                population:result.population});

});


//API 4
app.post("/districts/",authenticateToken,async(request,response)=>{
const {districtName,stateId,cases,cured,active,deaths}=request.body;
 const Query=`insert into district(district_name,state_id,cases,cured,active,deaths)
            values("${districtName}",${stateId},${cases},${cured},${active},${deaths})`
 
const result=await db.run(Query);
 response.send("District Successfully Added")


});



//API 5
app.get("/districts/:districtId/",authenticateToken,async(request,response)=>{
    const {districtId}=request.params;
    const Query=`select * from district where district_id=${districtId}`
    const result=await db.get(Query);
    response.send({districtId:result.district_id,districtName:result.district_name,
     stateId:result.state_id,cases:result.cases,
    cured:result.cured,active:result.active,deaths:result.deaths})
});


//API 6
app.delete("/districts/:districtId/",authenticateToken,async(request,response)=>{
    const {districtId}=request.params;
    const Query=`delete from district where district_id=${districtId}`
    const result=await db.run(Query);
    response.send("District Removed")
});

//API 7
app.put("/districts/:districtId/",authenticateToken,async(request,response)=>{
    const {districtId}=request.params;
    const {districtName,stateId,cases,cured,active,deaths}=request.body;
    const Query=`update district 
     set district_name="${districtName}",
         state_id=${stateId},cases=${cases},cured=${cured},active=${active},
         deaths=${deaths}
    where district_id=${districtId}`
    const result=await db.run(Query);
    response.send("District Details Updated");
});

//API 8

app.get("/states/:stateId/stats/",authenticateToken,async(request,response)=>{
  const{stateId}=request.params;
  const Query=`select sum(cases) as totalCases,sum(cured) as totalCured,
           sum(active) as totalActive,sum(deaths) as totalDeaths
           from district 
           where state_id=${stateId}`
    const result=await db.get(Query);
    response.send(result)


});

module.exports=app;






