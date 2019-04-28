const SORT_SPLIT = 'sort--'
const PAGE_SIZE = 50
const MAX_PAGE_AMOUNT = 20
const ObjectID = require('mongodb').ObjectID

module.exports = class {
  constructor (name) {
    this.name = name
    this.fields = {}
    this.fieldList = []
    this.documents = []
    this.count = 0
  }

  loadData (db, parameters, page = 1) {
    return new Promise((resolve, reject) => {
      this.getFieldsAndDocuments(db.collection(this.name), parameters, page)
        .then(() => {
          return this.countDocuments(db)
        })
        .then(() => resolve(this))
        .catch((err) => reject(err))
    })
  }

  getFieldsAndDocuments (collection, parameters, page, loadDocuments = true) {
    return new Promise((resolve, reject) => {
      let createdId
      if (parameters.createdId) {
        createdId = parameters.createdId
        delete parameters.createdId
      }

      collection.find(this.buildQueryObj(parameters)).sort(this.buildSortObj(parameters)).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray()
        .then(documents => {
          documents.forEach(document => {
            this.getFieldsAndDocument(document)
          })
          if (loadDocuments) this.documents = documents
          if (createdId) {
            return collection.findOne({ _id: new ObjectID(createdId) })
          } else {
            this.fieldList = Object.values(this.fields)
            resolve()
          }
        })
        .then((document) => {
          if (document) {
            console.log(document)
            this.getFieldsAndDocument(document)
            this.fieldList = Object.values(this.fields)
            this.documents = [document, ...this.documents]
          }
          resolve()
        })
        .catch(err => {
          console.log(err)
          reject(err)
        })
    })
  }

  buildSortObj (parameters) {
    let sortObj = {}
    for (const key in parameters) {
      if (parameters.hasOwnProperty(key) && key.startsWith(SORT_SPLIT) && parameters[key]) {
        const paramName = key.split(SORT_SPLIT)[1]
        sortObj[paramName] = Number(parameters[key])
      }
    }
    return sortObj
  }

  buildQueryObj (parameters) {
    // TODO: Modify to take into account different types
    let queryObj = {}
    for (const key in parameters) {
      if (parameters.hasOwnProperty(key) && !key.startsWith(SORT_SPLIT) && parameters[key]) {
        queryObj[key] = { $regex: parameters[key], $options: 'i' }
      }
    }
    return queryObj
  }

  getFormData (db, parameters, page = 0) {
    return new Promise((resolve, reject) => {
      this.getFieldsAndDocuments(db.collection(this.name), parameters, page, false)
        .then(() => {
          this.fieldList.forEach((field, index) => {
            let inputType
            switch (field.type) {
              case 'string':
                inputType = 'text'
                break
              case 'number':
                inputType = 'number'
                break
              case 'boolean':
                inputType = 'checkbox'
                break
              default:
                inputType = 'na'
                break
            }
            this.fieldList[index].inputType = inputType
          })

          this.fieldList = this.fieldList.filter(field => field.inputType !== 'na' && field.key !== '_id')
          resolve(this)
        })
        .catch((err) => reject(err))
    })
  }

  createDocument (db, object) {
    return new Promise((resolve, reject) => {
      db.collection(this.name).insertOne(object)
        .then((result) => {
          resolve(result.insertedId)
        })
        .catch((err) => reject(err))
    })
  }

  countDocuments (db) {
    return new Promise((resolve, reject) => {
      db.collection(this.name).countDocuments({}, { maxTimeMS: 5000 })
        .then((result) => {
          if (result / PAGE_SIZE <= MAX_PAGE_AMOUNT) {
            this.count = result
          }
          resolve()
        })
        .catch((err) => {
          if (err.code === 50) {
            resolve()
          } else {
            reject(err)
          }
        })
    })
  }

  getFieldsAndDocument (document) {
    for (const key in document) {
      if (document.hasOwnProperty(key) && document[key]) {
        if (!this.fields[key]) {
          this.fields[key] = {
            key: key,
            type: typeof document[key]
          }
        } else if (this.fields[key].type !== typeof document[key]) { // eslint-disable-line
          this.fields[key].type = 'mixed'
        }
      }
    }
  }
}
