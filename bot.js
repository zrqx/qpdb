// Trust me... I love you. You're awesome !! Thanks for being here

const { Telegraf } = require('telegraf')
const mongoose = require('mongoose')
const bot = new Telegraf(process.env.API_TOKEN)
const File = require('./models/file')
const User = require('./models/user')


mongoose.connect(process.env.DB_URI,{useNewUrlParser:true,useUnifiedTopology:true},(err,stat) => {
    if (!err) console.log('DB Connection Established')
    else console.log('Error establishing DB Connection')
})

async function greetUser(ctx,usermeta){
    const { id, first_name, last_name, username } = usermeta
    const response = await User.findOne({id:id})
    if (last_name) name = `${first_name} ${last_name}`
    else name = first_name
    if (response) ctx.reply(`Welcome Back, ${name} 👋🏼\n\nFetch and upload question papers based on your preferences.\n\n Commands:\n/get - fetch qp \n/post - upload qp`)
    else {
        ctx.reply(`Hello, ${name} 👋🏼\n\nFetch and upload question papers based on your preferences.\n\n Commands:\n/get - fetch qp \n/post - upload qp`)
        User.create({id,name,username,firstInteraction:Date.now()})
    }
}

function handleReply(ctx,type){
    let dest = ''
    if (type === 'image') dest = 'photo[3]'
    else if (type === 'document') dest = 'document'
    File.updateOne({uniqueId:eval(`ctx.update.message.reply_to_message.${dest}.file_unique_id`)},{code:ctx.update.message.text})
        .then(res => {
            ctx.deleteMessage()
            ctx.telegram.deleteMessage(ctx.update.message.chat.id,ctx.update.message.reply_to_message.message_id)
            ctx.reply(`Updated with code successfully - ${ctx.update.message.text}`)
        })
}

function setPreference(ctx,data) {
    User.updateOne({id:ctx.update.callback_query.from.id},{preference:data})
      .then( res => {
          ctx.reply(`Set Preference success - ${data}`)
      })
}

function getBranch(ctx){
    ctx.reply('Choose your Branch :',{
        reply_markup: {
            inline_keyboard: [
                [{text:"CS",callback_data:"CS"},{text:"CV",callback_data:"CV"},{text:"IS",callback_data:"IS"},{text:"TE",callback_data:"TE"}],
                [{text:"EC",callback_data:"EC"},{text:"EE",callback_data:"EE"},{text:"ME",callback_data:"ME"},{text:"ML",callback_data:"ML"}]
            ]
        }
    })
}

function getSemester(ctx) {
    ctx.editMessageText(`You've selected ${ctx.match[0]}. Select the Semester:`,{
        reply_markup: {
            inline_keyboard: [
                [{text:"1",callback_data:`${ctx.match[0]}1`},{text:"2",callback_data:`${ctx.match[0]}2`},{text:"3",callback_data:`${ctx.match[0]}3`},{text:"4",callback_data:`${ctx.match[0]}4`}],
                [{text:"5",callback_data:`${ctx.match[0]}5`},{text:"6",callback_data:`${ctx.match[0]}6`},{text:"7",callback_data:`${ctx.match[0]}7`},{text:"8",callback_data:`${ctx.match[0]}8`}],
                [{text:"Go to Branch Menu",callback_data:'GBM'}]
            ]
        }
    })
}

function queryFiles(ctx,prefs) {
    let regQuery = new RegExp(prefs)
    File.find({code:{ $regex: regQuery, $options: 'i' } },(err,data) => {
        if (!err) {
			data.sort((a,b) => (a.code > b.code) ? 1 : ((b.code > a.code) ? -1 : 0))
            if (data.length > 0) {
                let header = `Showing results for ${prefs}.\nFound ${data.length} files \n`
                let message = ''
                let count = 1
                for (each of data){
                    message += `${count}. ${each.code.slice(3)} ~ /dl_${each.size}\n `
                    count++
                }
                ctx.editMessageText(`${header} ${message}`)
            } else {
                ctx.editMessageText(`Showing results for ${prefs}\nNo files found. To upload - /post`)
            }
        }
    })
}

bot.start(ctx => {
	greetUser(ctx,ctx.update.message.from)
})

bot.command('get',async ctx => {
    const response = await User.findOne({id:ctx.update.message.from.id})
    if (response.preference) {
        ctx.reply(`Preference exists - ${response.preference}`,{
            reply_markup: {
                inline_keyboard: [
                    [{text:'Search for the Preference',callback_data:`*${response.preference}`}],
                    [{text:"Override Preferences",callback_data:'GBM'}]
                ]
            }
        })
    } else getBranch(ctx)
})

bot.command('/post',ctx => {
    ctx.reply(`Thank you for considering this option\n\n• Make sure that the qp you are about to send hasn't been uploaded previously. \n• Upload Individual question papers only.
Ex: M3 - 2nd Internals or CCP - Semester End.\n• If the Question paper is in a single page, send the image. (or the cropped screenshot of it)
• If the Question paper has multiple pages, consider sending a PDF. If possible, rename the PDF with a relevant name.\nEx: EC3-DEC-Semester_End-2019.pdf\n(Refrain yourself from using spaces in filenames)
\n Aahh..!! This already sounds like the instructions on the Answer Booklet. I'll stop here. Go ahead and send me some files.`)
})

bot.on('photo', ctx => {
	let meta = ctx.update.message.photo[3]
	File.findOne({size:meta.file_size},(err,data) => {
        if (!data) {
			let meta = ctx.update.message.photo[3]
			let caption = (ctx.update.message.caption != null) ? ctx.update.message.caption : 0
			File.create({
				id : meta.file_id,
				type : 'image',
				uniqueId : meta.file_unique_id,
				messageId : ctx.update.message.message_id,
				size : meta.file_size,
				caption : caption,
				sender : ctx.update.message.from.id
			}, (err,data) => {
				if (data) {
					ctx.reply('Image acknowledged and sent sent for review')
					ctx.telegram.sendPhoto(process.env.REVIEW_GROUP_ID,meta.file_id,{
						caption:`from: ${ctx.update.message.from.id}\n${caption}`
					})
				}
			})
		} else {
			ctx.reply('File exists already')
		}
    })
})

bot.on('document', ctx => {
	let meta = ctx.update.message.document
	File.findOne({size:meta.file_size},(err,data) => {
        if (!data) {
			let meta = ctx.update.message.document
			let caption = (ctx.update.message.caption != null) ? ctx.update.message.caption : 0
			File.create({
				id : meta.file_id,
				type : 'document',
				uniqueId : meta.file_unique_id,
				messageId : ctx.update.message.message_id,
				size : meta.file_size,
				caption : caption,
				sender : ctx.update.message.from.id
			}, (err,data) => {
				if (data) {
					ctx.reply('Document acknowledged and sent for review')
					ctx.telegram.sendDocument(process.env.REVIEW_GROUP_ID,meta.file_id,{
						caption:`from: ${ctx.update.message.from.id}\n${caption}`
					})
				}
			})
		} else {
			ctx.reply('File exists already')
		}
    })
})

// Actions 

bot.action('GBM',ctx => {
    ctx.deleteMessage()
    getBranch(ctx)
})

bot.action(/[*]/, ctx => {
    prefs = ctx.match.input.slice(1)
    queryFiles(ctx,prefs)
})

bot.action(/([A-Z]){2}([0-9]{1})/,ctx => {
    setPreference(ctx,ctx.match[0])
    queryFiles(ctx,ctx.match[0])
})

bot.action(/([A-Z]){2}/,ctx => {
    getSemester(ctx)
})


// Catch All

bot.on('message', ctx => {

	if (ctx.update.message.reply_to_message) {
        if (ctx.update.message.from.id == process.env.ADMIN_ID) {
            if (ctx.update.message.reply_to_message.document) {
				handleReply(ctx,'document')
            } else if (ctx.update.message.reply_to_message.photo[3]) {
				handleReply(ctx,'image')
            }
		}
	} else if (ctx.update.message.text) {
        if (ctx.update.message.text.includes('/dl')){
            let rq = ctx.update.message.text.slice(4)
            File.findOne({size:rq},(err,data) => {
				if (!data) {
					ctx.reply('Does that file exists ?')
				} else if(data.type === 'document') {
                    ctx.telegram.sendDocument(ctx.update.message.chat.id,data.id)
                } else if (data.type === 'image') {
                    ctx.telegram.sendPhoto(ctx.update.message.chat.id,data.id)
                }
            })
        } else {
            ctx.reply("You've chosen an unconfigured path")
        }
    }
	
	if (ctx.update.message.new_chat_members) {
		ctx.reply(ctx.update.message.chat)
	}
	if (ctx.update.message.left_chat_member){
		console.log('They Removed Me..')
	}
})

bot.launch()
  .then((err,stat) => {
      if (!err) console.log('Bot is Up')
      else console.log('Error occurred while Launching the Bot')
  })