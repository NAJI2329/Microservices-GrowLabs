const graphql = require("graphql");
const ClientType = require("../types/ClientType");
const Client = require("../../models/client");
const { UserInputError } = require("apollo-server");
const jwt = require("jsonwebtoken");

const { GraphQLID } = graphql;

const deleteClientMutation = {
  type: ClientType,
  args: {
    _id: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const adminAccessToken = context.cookies["admin-access-token"];

    if (!adminAccessToken) {
      throw new UserInputError("Admin is not authenticated.");
    } else {
      const deletedClient = await Client.findById({
        _id: args._id,
      });

      await Client.findByIdAndDelete({
        _id: args._id,
      });

      const decodedAdminID = jwt.decode(adminAccessToken).id.toString();

      const deletingEmployee = await Employee.findOne({
        _id: decodedAdminID,
      });

      let newNotification = new Notification({
        _id: new mongoose.Types.ObjectId(),
        new: true,
        type: "removeClient",
        associatedClientFirstName: deletedClient.firstName,
        associatedClientLastName: deletedClient.lastName,
        createdByFirstName: deletingEmployee.firstName,
        createdByLastName: deletingEmployee.lastName,
      });

      const update = createNotificationFunction(
        newNotification,
        deletingEmployee
      );

      await Employee.updateMany({ employeeRole: "Admin" }, update, {
        new: true,
        multi: true,
      });

      const updatedEmployee = await Employee.findOneAndUpdate(
        { _id: decodedAdminID },
        update,
        {
          new: true,
        }
      );

      const updatedEmployeeRes = await updatedEmployee.save();

      context.pubsub.publish(UPDATED_EMPLOYEE, {
        employee: updatedEmployeeRes,
      });

      return {
        _id: args._id,
        ...updatedEmployeeRes,
      };
    }
  },
};

module.exports = deleteClientMutation;
