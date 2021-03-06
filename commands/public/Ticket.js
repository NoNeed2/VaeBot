module.exports = Cmds.addCommand({
    cmds: [';ticket ', ';support ', ';ask ', ';addticket ', ';submitticket ', ';sendticket ', ';newticket '],

    requires: {
        guild: true,
        loud: false,
    },

    desc: 'Create a ticket to be viewed by Support',

    args: '([ticket_details])',

    example: 'Am I able to give away my whitelist?',

    // /////////////////////////////////////////////////////////////////////////////////////////

    func: (cmd, args, msgObj, speaker, channel, guild) => {
        if (!channel.name.toLowerCase().includes('support') && !channel.name.toLowerCase().includes('staff') && speaker.id !== vaebId && speaker.id !== guild.ownerID) {
            return Util.commandFailed(channel, speaker, 'Support tickets can only be generated in #support');
        }

        const nextTicketNum = Data.nextIncGet('tickets');

        const newRow = {
            user_id: speaker.id,
            description: args,
            open_tick: +new Date(),
            active: 1,
        };
        Data.addRecord(guild, 'tickets', newRow);

        const sendEmbedFields = [
            { name: 'Ticket User', value: Util.resolveMention(speaker), inline: false },
            { name: 'Ticket Info', value: args, inline: false },
        ];
        Util.sendEmbed(channel, `Generated Support Ticket #${nextTicketNum}`, null, Util.makeEmbedFooter(speaker), null, colGreen, sendEmbedFields);

        const roleSupport = Util.getRole('Support', guild);

        if (roleSupport) {
            const roleTrialSupport = Util.getRole('Trial Support', guild);
            const mentionSupport = roleTrialSupport ? `${roleSupport.toString()} ${roleTrialSupport.toString()}` : roleSupport.toString();
            Util.print(channel, `${mentionSupport} A new support ticket has been generated by ${Util.resolveMention(speaker)}!`);
        }

        return true;
    },
});
